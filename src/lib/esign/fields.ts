/**
 * Contract field mapping for SignWell templates.
 *
 * Each SignWell template (Goldendoodle, Bernedoodle) must contain text fields
 * whose "API ID" (api_id) matches these names exactly (case-sensitive).
 * See docs/SIGNWELL-SETUP.md.
 */

import type { ContractFields } from "@/lib/esign/types";

export const SIGNWELL_FIELD_IDS = {
  litterPuppy: "litter_puppy",
  place: "place",
  price: "price",
  depositMethod: "deposit_method",
  buyerName: "buyer_name",
  buyerEmail: "buyer_email",
  buyerStreet: "buyer_street",
  buyerCity: "buyer_city",
  buyerState: "buyer_state",
  buyerZip: "buyer_zip",
  buyerPhone: "buyer_phone",
} as const;

/** Must exist on every contract template. */
export const SIGNWELL_REQUIRED_FIELD_IDS: string[] = [
  SIGNWELL_FIELD_IDS.litterPuppy,
  SIGNWELL_FIELD_IDS.place,
  SIGNWELL_FIELD_IDS.price,
  SIGNWELL_FIELD_IDS.depositMethod,
];

/** Sent only when the template has them and a value is on file. */
export const SIGNWELL_OPTIONAL_FIELD_IDS: string[] = [
  SIGNWELL_FIELD_IDS.buyerName,
  SIGNWELL_FIELD_IDS.buyerEmail,
  SIGNWELL_FIELD_IDS.buyerStreet,
  SIGNWELL_FIELD_IDS.buyerCity,
  SIGNWELL_FIELD_IDS.buyerState,
  SIGNWELL_FIELD_IDS.buyerZip,
  SIGNWELL_FIELD_IDS.buyerPhone,
];

/** Default placeholder (role) name on the SignWell templates. */
export const SIGNWELL_BUYER_PLACEHOLDER = "Buyer";

function s(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}

export function formatLitterPuppy(litter?: string | null, puppy?: string | null): string {
  const lit = s(litter);
  const pup = s(puppy);
  if (lit && pup) return `${lit} / ${pup}`;
  return lit || pup;
}

/** Place = pick number only ("3"). Anything else → "". */
export function normalizePickNumber(v: unknown): string {
  const t = s(v).replace(/^#/, "");
  if (!/^\d{1,3}$/.test(t)) return "";
  const n = Number(t);
  return Number.isInteger(n) && n > 0 ? String(n) : "";
}

export function parseAmount(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[$,]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** "Venmo — $1200" / "$1200" / "Venmo". */
export function formatDepositMethod(method?: string | null, amount?: number | string | null): string {
  const m = s(method);
  const n = parseAmount(amount);
  if (n > 0) {
    const dollars = Number.isInteger(n) ? String(n) : n.toFixed(2);
    return m ? `${m} — $${dollars}` : `$${dollars}`;
  }
  return m;
}

/** api_id → value for every field we know how to fill ("" = nothing to send). */
export function buildSignWellFieldValues(f: ContractFields): Record<string, string> {
  return {
    [SIGNWELL_FIELD_IDS.litterPuppy]: formatLitterPuppy(f.litter, f.puppy) || "—",
    [SIGNWELL_FIELD_IDS.place]: normalizePickNumber(f.place) || "—",
    [SIGNWELL_FIELD_IDS.price]: s(f.price) || "TBD",
    [SIGNWELL_FIELD_IDS.depositMethod]: formatDepositMethod(f.depositMethod, f.depositAmount) || "—",
    [SIGNWELL_FIELD_IDS.buyerName]: s(f.buyerName),
    [SIGNWELL_FIELD_IDS.buyerEmail]: s(f.buyerEmail),
    [SIGNWELL_FIELD_IDS.buyerStreet]: s(f.street),
    [SIGNWELL_FIELD_IDS.buyerCity]: s(f.city),
    [SIGNWELL_FIELD_IDS.buyerState]: s(f.state),
    [SIGNWELL_FIELD_IDS.buyerZip]: s(f.zip),
    [SIGNWELL_FIELD_IDS.buyerPhone]: s(f.phone),
  };
}

/**
 * Build SignWell `template_fields`. When the template's api_ids are known,
 * only send ids that exist (SignWell rejects unknown ids); optional ids with
 * no value are skipped.
 */
export function buildTemplateFieldsPayload(
  f: ContractFields,
  templateApiIds?: Set<string> | null
): { fields: { api_id: string; value: string }[]; applied: string[]; skipped: string[]; missingRequired: string[] } {
  const values = buildSignWellFieldValues(f);
  const fields: { api_id: string; value: string }[] = [];
  const applied: string[] = [];
  const skipped: string[] = [];
  const known = templateApiIds && templateApiIds.size > 0 ? templateApiIds : null;
  const missingRequired = known
    ? SIGNWELL_REQUIRED_FIELD_IDS.filter((id) => !known.has(id))
    : [];

  for (const id of [...SIGNWELL_REQUIRED_FIELD_IDS, ...SIGNWELL_OPTIONAL_FIELD_IDS]) {
    const required = SIGNWELL_REQUIRED_FIELD_IDS.includes(id);
    const value = values[id] ?? "";
    if (known && !known.has(id)) {
      skipped.push(id);
      continue;
    }
    // Unknown template layout: only send required ids (safe set)
    if (!known && !required) {
      skipped.push(id);
      continue;
    }
    if (!required && !value) {
      skipped.push(id);
      continue;
    }
    fields.push({ api_id: id, value });
    applied.push(id);
  }
  return { fields, applied, skipped, missingRequired };
}
