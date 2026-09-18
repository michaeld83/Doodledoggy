import { prisma } from "@/lib/prisma";
import { MatingClient } from "@/components/MatingClient";

export const dynamic = "force-dynamic";

export default async function MatingPage({
  searchParams,
}: {
  searchParams: { damId?: string; sireId?: string };
}) {
  const dogs = await prisma.dog.findMany({
    where: { status: { in: ["ACTIVE", "RETIRED"] } },
    select: { id: true, callName: true, sex: true, registeredName: true },
    orderBy: { callName: "asc" },
  });
  const threshold = process.env.COI_WARN_THRESHOLD || "6.25";
  const gens = process.env.COI_COMMON_ANCESTOR_GENS || "4";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Mating / COI checker</h1>
        <p className="text-sm text-[var(--muted)]">
          Wright&apos;s coefficient of inbreeding before mating. Warns at ≥{threshold}% COI or common ancestor within {gens} generations. High relatedness requires confirmation.
        </p>
      </div>
      <MatingClient
        females={dogs.filter((d) => d.sex === "FEMALE")}
        males={dogs.filter((d) => d.sex === "MALE")}
        initialDamId={searchParams.damId}
        initialSireId={searchParams.sireId}
        defaultGens={Number(gens)}
      />
    </div>
  );
}
