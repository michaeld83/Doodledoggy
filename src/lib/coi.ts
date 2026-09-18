/**
 * Wright's Coefficient of Inbreeding (COI)
 * F = Σ (1/2)^n * (1 + F_a) over all common ancestors
 * where n = generations via sire path + dam path.
 * We use path enumeration with F_a ≈ 0 for simplicity at depth limit,
 * or recursively compute ancestor COI when depth allows.
 */

export type PedigreeNode = {
  id: string;
  callName: string;
  registeredName: string;
  sex: string;
  motherId: string | null;
  fatherId: string | null;
};

type DogMap = Map<string, PedigreeNode>;

function getAncestors(
  dogId: string | null | undefined,
  dogs: DogMap,
  maxGen: number,
  gen = 0,
  path: string[] = []
): { id: string; gen: number; path: string[] }[] {
  if (!dogId || gen > maxGen) return [];
  const dog = dogs.get(dogId);
  if (!dog) return [];
  const here = { id: dogId, gen, path: [...path, dogId] };
  if (gen === maxGen) return [here];
  return [
    here,
    ...getAncestors(dog.motherId, dogs, maxGen, gen + 1, [...path, dogId]),
    ...getAncestors(dog.fatherId, dogs, maxGen, gen + 1, [...path, dogId]),
  ];
}

/** All unique paths from dog to a given ancestor within maxGen */
function pathsToAncestor(
  dogId: string | null | undefined,
  ancestorId: string,
  dogs: DogMap,
  maxGen: number,
  gen = 0,
  path: string[] = []
): string[][] {
  if (!dogId || gen > maxGen) return [];
  if (dogId === ancestorId) return [[...path, dogId]];
  const dog = dogs.get(dogId);
  if (!dog) return [];
  const next = [...path, dogId];
  return [
    ...pathsToAncestor(dog.motherId, ancestorId, dogs, maxGen, gen + 1, next),
    ...pathsToAncestor(dog.fatherId, ancestorId, dogs, maxGen, gen + 1, next),
  ];
}

function ancestorCoi(ancestorId: string, dogs: DogMap, maxGen: number, memo: Map<string, number>): number {
  if (memo.has(ancestorId)) return memo.get(ancestorId)!;
  const dog = dogs.get(ancestorId);
  if (!dog || !dog.motherId || !dog.fatherId) {
    memo.set(ancestorId, 0);
    return 0;
  }
  // Avoid infinite recursion — compute with reduced depth
  const f = computeCoiBetween(dog.motherId, dog.fatherId, dogs, Math.max(1, maxGen - 1), memo).coi;
  memo.set(ancestorId, f);
  return f;
}

export type CoiResult = {
  coi: number; // 0–1
  coiPercent: number;
  commonAncestors: {
    id: string;
    callName: string;
    registeredName: string;
    contribution: number;
    damGens: number;
    sireGens: number;
  }[];
  highRelatedness: boolean;
  warnCommonWithin: boolean;
  warningMessage: string | null;
};

export function computeCoiBetween(
  damId: string,
  sireId: string,
  dogs: DogMap,
  maxGen = 5,
  memo = new Map<string, number>()
): CoiResult {
  if (damId === sireId) {
    return {
      coi: 0.5,
      coiPercent: 50,
      commonAncestors: [],
      highRelatedness: true,
      warnCommonWithin: true,
      warningMessage: "Dam and sire are the same dog.",
    };
  }

  const damAnc = getAncestors(damId, dogs, maxGen);
  const sireAnc = getAncestors(sireId, dogs, maxGen);
  const damIds = new Set(damAnc.map((a) => a.id));
  const commonIds = Array.from(new Set(sireAnc.map((a) => a.id).filter((id) => damIds.has(id))));

  // Also treat shared parents of the proposed mating's parents
  const commonAncestors: CoiResult["commonAncestors"] = [];
  let coi = 0;

  for (const ancId of commonIds) {
    const damPaths = pathsToAncestor(damId, ancId, dogs, maxGen);
    const sirePaths = pathsToAncestor(sireId, ancId, dogs, maxGen);
    if (!damPaths.length || !sirePaths.length) continue;

    let contribution = 0;
    const Fa = ancestorCoi(ancId, dogs, maxGen, memo);
    let minDam = Infinity;
    let minSire = Infinity;

    for (const dp of damPaths) {
      for (const sp of sirePaths) {
        // Independent paths: only count if paths intersect only at ancestor
        const dOnly = dp.slice(0, -1);
        const sOnly = sp.slice(0, -1);
        const overlap = dOnly.some((id) => sOnly.includes(id));
        if (overlap) continue;
        // Wright: F = Σ (1/2)^(n1+n2+1) * (1+Fa)
        const n1 = dp.length - 1;
        const n2 = sp.length - 1;
        const n = n1 + n2 + 1;
        contribution += Math.pow(0.5, n) * (1 + Fa);
        minDam = Math.min(minDam, n1);
        minSire = Math.min(minSire, n2);
      }
    }

    if (contribution > 0) {
      coi += contribution;
      const dog = dogs.get(ancId)!;
      commonAncestors.push({
        id: ancId,
        callName: dog.callName,
        registeredName: dog.registeredName,
        contribution,
        damGens: minDam === Infinity ? 0 : minDam,
        sireGens: minSire === Infinity ? 0 : minSire,
      });
    }
  }

  commonAncestors.sort((a, b) => b.contribution - a.contribution);

  const threshold = parseFloat(process.env.COI_WARN_THRESHOLD || "6.25") / 100;
  const commonGens = parseInt(process.env.COI_COMMON_ANCESTOR_GENS || "4", 10);
  const warnCommonWithin = commonAncestors.some(
    (c) => c.damGens <= commonGens && c.sireGens <= commonGens
  );
  const highRelatedness = coi >= threshold || warnCommonWithin;

  let warningMessage: string | null = null;
  if (highRelatedness) {
    const parts: string[] = [];
    if (coi >= threshold) {
      parts.push(`COI ${(coi * 100).toFixed(2)}% meets/exceeds warning threshold ${(threshold * 100).toFixed(2)}%.`);
    }
    if (warnCommonWithin) {
      parts.push(`Common ancestor(s) within ${commonGens} generations on both sides.`);
    }
    warningMessage = parts.join(" ");
  }

  return {
    coi,
    coiPercent: Math.round(coi * 10000) / 100,
    commonAncestors,
    highRelatedness,
    warnCommonWithin,
    warningMessage,
  };
}

export function dogsToMap(
  dogs: {
    id: string;
    callName: string;
    registeredName: string;
    sex: string;
    motherId: string | null;
    fatherId: string | null;
  }[]
): DogMap {
  return new Map(dogs.map((d) => [d.id, d]));
}

/** Build nested pedigree tree for display */
export type PedigreeTree = {
  id: string;
  callName: string;
  registeredName: string;
  sex: string;
  mother: PedigreeTree | null;
  father: PedigreeTree | null;
} | null;

export function buildPedigree(
  dogId: string | null | undefined,
  dogs: DogMap,
  depth: number
): PedigreeTree {
  if (!dogId || depth < 0) return null;
  const dog = dogs.get(dogId);
  if (!dog) return null;
  return {
    id: dog.id,
    callName: dog.callName,
    registeredName: dog.registeredName,
    sex: dog.sex,
    mother: depth > 0 ? buildPedigree(dog.motherId, dogs, depth - 1) : null,
    father: depth > 0 ? buildPedigree(dog.fatherId, dogs, depth - 1) : null,
  };
}
