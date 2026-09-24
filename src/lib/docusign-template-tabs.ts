/**
 * DocuSign Buyer-role address textTabs for puppy contract templates.
 *
 * Layout (signature page): STREET (widest) → CITY → STATE → ZIP, then PHONE below.
 * Prefer static maps by template family / known templateId. If a live template's
 * tabLabel UUIDs differ, use sortTextTabsByPosition + ADDRESS_FIELD_ORDER heuristic.
 */

export type TemplateFamily = "goldendoodle" | "bernedoodle";

export type AddressFieldKey = "street" | "city" | "state" | "zip" | "phone";

export const ADDRESS_FIELD_ORDER: AddressFieldKey[] = [
  "street",
  "city",
  "state",
  "zip",
  "phone",
];

export type AddressFields = Partial<Record<AddressFieldKey, string | null | undefined>> & {
  buyerName?: string | null;
  buyerEmail?: string | null;
  /** Litter label (staff field; emailBlurb / templateFieldsJson only) */
  litter?: string | null;
  /** Puppy name (staff field; emailBlurb / templateFieldsJson only) */
  puppy?: string | null;
  /** Free-text puppy price; typically "TBD" until looks determine amount */
  price?: string | null;
  /** Place paid / where paid */
  place?: string | null;
  /** Deposit payment method (CASH/VENMO/…) */
  depositMethod?: string | null;
  /** Deposit amount in dollars (staff field; not puppy price) */
  depositAmount?: number | string | null;
  notes?: string | null;
};

/** Known Buyer textTab labels per family (from template JSON exports + live sandbox). */
export const BUYER_ADDRESS_TAB_LABELS: Record<
  TemplateFamily,
  Record<AddressFieldKey, string>
> = {
  goldendoodle: {
    street: "Text b8c8ada0-4e84-44c6-a55a-41c5fae81124",
    city: "Text cb306b59-067e-477a-aee9-26b6d7903d7d",
    state: "Text ee714cbf-2800-4ced-9dfe-cfd44162cc67",
    zip: "Text e71af000-99df-419d-b17a-526c1745123a",
    phone: "Text b713415c-9790-44cf-b171-47c1a30d03e1",
  },
  bernedoodle: {
    street: "Text 631ec59a-9f1b-4417-985c-a51ba777f6e3",
    city: "Text e4238aa8-097d-422f-907a-3af4ff984ddf",
    state: "Text 02c7312e-7701-416e-8a0d-2011000cae0d",
    zip: "Text 2c7e1ead-e350-479a-b601-1c5bfa2412a6",
    phone: "Text 660069fd-4e13-43ba-949a-87b124ca785f",
  },
};

/**
 * Extra known templateIds (export copies + sandbox env defaults) → family.
 * Env DOCUSIGN_TEMPLATE_* may point at either set; tab labels are shared within family.
 */
export const TEMPLATE_ID_FAMILY: Record<string, TemplateFamily> = {
  // Sandbox defaults currently in Vercel / .env.example
  "cb1b6556-d557-4c96-bbae-db7553996865": "goldendoodle",
  "9c858314-95a2-4e42-8b98-56e0b3c76bff": "bernedoodle",
  // JSON export copies Michael attached
  "8d096401-d2bd-40e1-b395-bea62bd3d291": "goldendoodle",
  "de3985aa-efee-4c9b-8978-63cb23f8524c": "bernedoodle",
};

export type DocuSignTextTab = {
  tabLabel?: string;
  pageNumber?: string | number;
  xPosition?: string | number;
  yPosition?: string | number;
  width?: string | number;
  value?: string;
  locked?: string | boolean;
  required?: string | boolean;
};

export function familyFromTemplateId(
  templateId?: string | null
): TemplateFamily | null {
  if (!templateId) return null;
  return TEMPLATE_ID_FAMILY[templateId.trim()] || null;
}

/** Sort Buyer textTabs reading-order: page → y → x. */
export function sortTextTabsByPosition(tabs: DocuSignTextTab[]): DocuSignTextTab[] {
  return [...tabs].sort((a, b) => {
    const page = Number(a.pageNumber || 0) - Number(b.pageNumber || 0);
    if (page !== 0) return page;
    const y = Number(a.yPosition || 0) - Number(b.yPosition || 0);
    if (Math.abs(y) > 8) return y;
    return Number(a.xPosition || 0) - Number(b.xPosition || 0);
  });
}

/**
 * Map live textTabs → address fields by position heuristic
 * (street, city, state, zip, phone left-to-right / top-to-bottom).
 */
export function mapAddressLabelsFromLiveTabs(
  textTabs: DocuSignTextTab[]
): Record<AddressFieldKey, string> | null {
  const sorted = sortTextTabsByPosition(
    textTabs.filter((t) => t.tabLabel && String(t.tabLabel).trim())
  );
  if (sorted.length < 5) return null;
  const out = {} as Record<AddressFieldKey, string>;
  for (let i = 0; i < ADDRESS_FIELD_ORDER.length; i++) {
    out[ADDRESS_FIELD_ORDER[i]] = String(sorted[i].tabLabel);
  }
  return out;
}

export function resolveAddressTabLabels(input: {
  family?: TemplateFamily | null;
  templateId?: string | null;
  liveTextTabs?: DocuSignTextTab[] | null;
}): Record<AddressFieldKey, string> | null {
  const family =
    input.family || familyFromTemplateId(input.templateId) || null;
  if (family) return BUYER_ADDRESS_TAB_LABELS[family];
  if (input.liveTextTabs?.length) {
    return mapAddressLabelsFromLiveTabs(input.liveTextTabs);
  }
  return null;
}

/** Build DocuSign templateRoles[].tabs.textTabs for Buyer address block. */
export function buildBuyerAddressTextTabs(
  labels: Record<AddressFieldKey, string>,
  fields: AddressFields,
  options?: { locked?: boolean }
): { tabLabel: string; value: string; locked: string }[] {
  // Default unlocked so buyer can correct address at signing
  const locked = options?.locked === true ? "true" : "false";
  const tabs: { tabLabel: string; value: string; locked: string }[] = [];
  for (const key of ADDRESS_FIELD_ORDER) {
    const value = String(fields[key] ?? "").trim();
    if (!value) continue; // omit empty → buyer fills at signing
    tabs.push({ tabLabel: labels[key], value, locked });
  }
  return tabs;
}


function formatDepositDollars(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "0.00";
  const n = typeof v === "number" ? v : Number(String(v).replace(/[$,]/g, ""));
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

/** Contract email blurb + audit summary (staff fields + optional address). */
export function buildAddressEmailBlurb(fields: AddressFields): string {
  const lines = [
    `Buyer: ${fields.buyerName || "—"}`,
    `Email: ${fields.buyerEmail || "—"}`,
    `Litter: ${fields.litter || "—"}`,
    `Puppy: ${fields.puppy || "—"}`,
    `Price: ${String(fields.price || "TBD").trim() || "TBD"}`,
    `Deposit: $${formatDepositDollars(fields.depositAmount)}`,
    `Place paid: ${fields.place || "—"}`,
    `Deposit method: ${fields.depositMethod || "—"}`,
  ];
  const address = [fields.street, fields.city, fields.state, fields.zip]
    .filter((p) => String(p || "").trim())
    .join(", ");
  if (address || fields.phone) {
    lines.push(`Address: ${address || "—"}`);
    lines.push(`Phone: ${fields.phone || "—"}`);
  }
  if (fields.notes) lines.push(`Notes: ${fields.notes}`);
  return lines.join("\n");
}
