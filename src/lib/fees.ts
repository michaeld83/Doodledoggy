export type CustomFeeLine = { label: string; amount: number };

export type FeeAddOns = {
  snugglePuppy: boolean;
  snugglePuppyAmount: number | null;
  travelBag: boolean;
  travelBagAmount: number | null;
  travelArrangements: boolean;
  travelArrangementsNotes: string | null;
  travelArrangementsAmount: number | null;
  customFees: CustomFeeLine[];
};

export type FeeLineItem = {
  key: string;
  label: string;
  amount: number;
  notes?: string | null;
};

export function parseCustomFees(json: string | null | undefined): CustomFeeLine[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => ({
        label: String(row?.label || "").trim(),
        amount: Number(row?.amount || 0),
      }))
      .filter((row) => row.label.length > 0);
  } catch {
    return [];
  }
}

export function serializeCustomFees(fees: CustomFeeLine[]): string | null {
  const clean = fees
    .map((f) => ({ label: String(f.label || "").trim(), amount: Number(f.amount || 0) }))
    .filter((f) => f.label.length > 0);
  return clean.length ? JSON.stringify(clean) : null;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function normalizeAddOns(input: Partial<FeeAddOns> | Record<string, unknown>): FeeAddOns {
  const customRaw = (input as Record<string, unknown>).customFees;
  let customFees: CustomFeeLine[] = [];
  if (typeof customRaw === "string") customFees = parseCustomFees(customRaw);
  else if (Array.isArray(customRaw)) {
    customFees = customRaw.map((row) => ({
      label: String((row as CustomFeeLine)?.label || "").trim(),
      amount: Number((row as CustomFeeLine)?.amount || 0),
    }));
  }

  const rec = input as Record<string, unknown>;
  return {
    snugglePuppy: Boolean(rec.snugglePuppy),
    snugglePuppyAmount: numOrNull(rec.snugglePuppyAmount),
    travelBag: Boolean(rec.travelBag),
    travelBagAmount: numOrNull(rec.travelBagAmount),
    travelArrangements: Boolean(rec.travelArrangements),
    travelArrangementsNotes: rec.travelArrangementsNotes
      ? String(rec.travelArrangementsNotes)
      : null,
    travelArrangementsAmount: numOrNull(rec.travelArrangementsAmount),
    customFees,
  };
}

export function buildFeeLineItems(depositAmount: number, addOns: FeeAddOns): FeeLineItem[] {
  const lines: FeeLineItem[] = [
    { key: "deposit", label: "Deposit", amount: Number(depositAmount) || 0 },
  ];
  if (addOns.snugglePuppy) {
    lines.push({
      key: "snugglePuppy",
      label: "Snuggle puppy",
      amount: Number(addOns.snugglePuppyAmount) || 0,
    });
  }
  if (addOns.travelBag) {
    lines.push({
      key: "travelBag",
      label: "Travel bag",
      amount: Number(addOns.travelBagAmount) || 0,
    });
  }
  if (addOns.travelArrangements) {
    lines.push({
      key: "travelArrangements",
      label: "Travel arrangements",
      amount: Number(addOns.travelArrangementsAmount) || 0,
      notes: addOns.travelArrangementsNotes,
    });
  }
  addOns.customFees.forEach((fee, i) => {
    lines.push({
      key: `custom-${i}`,
      label: fee.label,
      amount: Number(fee.amount) || 0,
    });
  });
  return lines;
}

export function sumFeeLines(lines: FeeLineItem[]): number {
  return lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
}

export function feesSnapshotJson(depositAmount: number, addOns: FeeAddOns): string {
  const lines = buildFeeLineItems(depositAmount, addOns);
  return JSON.stringify({
    depositAmount: Number(depositAmount) || 0,
    addOns,
    lines,
    total: sumFeeLines(lines),
  });
}

export function reservationFeeFields(addOns: FeeAddOns, depositAmount: number) {
  const lines = buildFeeLineItems(depositAmount, addOns);
  return {
    snugglePuppy: addOns.snugglePuppy,
    snugglePuppyAmount: addOns.snugglePuppy ? addOns.snugglePuppyAmount : null,
    travelBag: addOns.travelBag,
    travelBagAmount: addOns.travelBag ? addOns.travelBagAmount : null,
    travelArrangements: addOns.travelArrangements,
    travelArrangementsNotes: addOns.travelArrangements ? addOns.travelArrangementsNotes : null,
    travelArrangementsAmount: addOns.travelArrangements ? addOns.travelArrangementsAmount : null,
    customFeesJson: serializeCustomFees(addOns.customFees),
    feesTotal: sumFeeLines(lines),
  };
}

export function addOnsFromReservation(r: {
  snugglePuppy?: boolean | null;
  snugglePuppyAmount?: number | null;
  travelBag?: boolean | null;
  travelBagAmount?: number | null;
  travelArrangements?: boolean | null;
  travelArrangementsNotes?: string | null;
  travelArrangementsAmount?: number | null;
  customFeesJson?: string | null;
}): FeeAddOns {
  return {
    snugglePuppy: Boolean(r.snugglePuppy),
    snugglePuppyAmount: r.snugglePuppyAmount ?? null,
    travelBag: Boolean(r.travelBag),
    travelBagAmount: r.travelBagAmount ?? null,
    travelArrangements: Boolean(r.travelArrangements),
    travelArrangementsNotes: r.travelArrangementsNotes ?? null,
    travelArrangementsAmount: r.travelArrangementsAmount ?? null,
    customFees: parseCustomFees(r.customFeesJson),
  };
}
