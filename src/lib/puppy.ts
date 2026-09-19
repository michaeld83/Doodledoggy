/** Sync puppy picker / add-on flags from a linked reservation. */
export function puppyFieldsFromReservation(r: {
  customerId?: string | null;
  pickPosition?: number | null;
  snugglePuppy?: boolean | null;
  travelBag?: boolean | null;
  travelArrangements?: boolean | null;
  status?: string | null;
}) {
  const wantsTravelDocuments = Boolean(r.travelBag || r.travelArrangements);
  const reservedLike =
    !r.status || r.status === "OPEN" || r.status === "COMPLETED";
  return {
    ...(r.customerId ? { customerId: r.customerId } : {}),
    ...(r.pickPosition != null ? { pickPosition: r.pickPosition } : {}),
    wantsSnugglePuppy: Boolean(r.snugglePuppy),
    wantsTravelDocuments,
    ...(reservedLike ? { status: "RESERVED" as const } : {}),
  };
}

export type PuppyPickerSource = {
  customer?: { id: string; name: string; phone: string | null } | null;
  reservation?: {
    buyerName: string | null;
    buyerPhone: string | null;
    customer?: { id: string; name: string; phone: string | null } | null;
  } | null;
};

export function resolvePicker(p: PuppyPickerSource): {
  name: string | null;
  phone: string | null;
  customerId: string | null;
} {
  const c = p.customer || p.reservation?.customer || null;
  if (c) {
    return { name: c.name, phone: c.phone, customerId: c.id };
  }
  const name = p.reservation?.buyerName || null;
  const phone = p.reservation?.buyerPhone || null;
  return { name, phone, customerId: null };
}

/** Display label: call name if set, else original temp name. */
export function puppyDisplayName(p: { tempName: string; callName?: string | null }) {
  const call = (p.callName || "").trim();
  return call || p.tempName;
}
