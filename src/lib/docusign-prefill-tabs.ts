/**
 * LEGACY: DocuSign, inactive on the `signwell` branch (used only when
 * ESIGN_PROVIDER=docusign). Kept intact for rollback — see
 * src/lib/esign/legacy-docusign/README.md. Active provider: src/lib/esign/signwell.ts.
 */
/**
 * Document prefillTabs (sender-fill) for puppy contract templates.
 *
 * REQUIRED_TAB_INCOMPLETE on send: templates have required empty prefill
 * textTabs. After create (status=created), GET envelope document tabs, then
 * PUT using envelope tabIds (tabLabel alone → INVALID_TABID), then status=sent.
 *
 * Mapping: match known template tabLabels when present; else required===true
 * sorted by y then x → [litter/puppy, place, price, deposit method].
 *
 * Values: Litter/Puppy = "litter / puppy"; Place = pick number only ("3");
 * Price = staff price or TBD; Deposit Method = "Venmo — $1200".
 */

import type { TemplateFamily } from "@/lib/docusign-template-tabs";
import { familyFromTemplateId } from "@/lib/docusign-template-tabs";

export type PrefillFieldKey =
  | "litterPuppy"
  | "place"
  | "price"
  | "depositMethod";

export const PREFILL_FIELD_ORDER: PrefillFieldKey[] = [
  "litterPuppy",
  "place",
  "price",
  "depositMethod",
];

export type PrefillStaffFields = {
  litter?: string | null;
  puppy?: string | null;
  price?: string | null;
  place?: string | null;
  depositMethod?: string | null;
  depositAmount?: number | string | null;
};

/** Known template tabLabels for required value tabs (label-only tabs left alone). */
export const PREFILL_VALUE_TAB_LABELS: Record<
  TemplateFamily,
  Record<PrefillFieldKey, string>
> = {
  bernedoodle: {
    litterPuppy: "Text 4c00e85f-9eff-4961-a2fb-4f7047436074",
    place: "Text 2e762594-b0bb-4c7c-b41b-40d9d2ff88ea",
    price: "Text e71c1c3d-51c6-4450-8cf5-23688380bc0b",
    depositMethod: "Text 277dc8e1-b182-41f8-b4d7-b254c51b57fc",
  },
  goldendoodle: {
    litterPuppy: "Text 6807d12c-48da-4b11-a78a-bd008eed3b3d",
    place: "Text 482c36df-c6af-4c08-8be0-b80c35db8b23",
    price: "Text 9725cee2-131e-4567-bf18-f6be2768cb8d",
    depositMethod: "Text 71c222a9-3ed1-4b29-bc94-09ee65ff2e11",
  },
};

export const PREFILL_TAB_LABELS_BY_TEMPLATE_ID: Record<
  string,
  Record<PrefillFieldKey, string>
> = {
  "9c858314-95a2-4e42-8b98-56e0b3c76bff": PREFILL_VALUE_TAB_LABELS.bernedoodle,
  "cb1b6556-d557-4c96-bbae-db7553996865": PREFILL_VALUE_TAB_LABELS.goldendoodle,
};

export type EnvelopePrefillTextTab = {
  tabId?: string;
  tabLabel?: string;
  pageNumber?: string | number;
  xPosition?: string | number;
  yPosition?: string | number;
  width?: string | number;
  value?: string;
  required?: string | boolean;
};

export function resolvePrefillTabLabels(input: {
  family?: TemplateFamily | null;
  templateId?: string | null;
}): Record<PrefillFieldKey, string> | null {
  const tid = input.templateId?.trim();
  if (tid && PREFILL_TAB_LABELS_BY_TEMPLATE_ID[tid]) {
    return PREFILL_TAB_LABELS_BY_TEMPLATE_ID[tid];
  }
  const family =
    input.family || familyFromTemplateId(input.templateId) || null;
  if (family) return PREFILL_VALUE_TAB_LABELS[family];
  return null;
}

export function formatLitterPuppy(
  litter?: string | null,
  puppy?: string | null
): string {
  const lit = String(litter ?? "").trim();
  const pup = String(puppy ?? "").trim();
  if (lit && pup) return `${lit} / ${pup}`;
  return lit || pup || "";
}

export function formatDepositMethodValue(
  method?: string | null,
  amount?: number | string | null
): string {
  const m = String(method ?? "").trim();
  let n = 0;
  if (amount !== null && amount !== undefined && amount !== "") {
    const parsed =
      typeof amount === "number"
        ? amount
        : Number(String(amount).replace(/[$,]/g, ""));
    if (Number.isFinite(parsed)) n = parsed;
  }
  if (n > 0) {
    const dollars = Number.isInteger(n) ? String(n) : n.toFixed(2);
    return m ? `${m} — $${dollars}` : `$${dollars}`;
  }
  return m;
}

/**
 * Place on the contract = puppy pick number (e.g. "3"), never where the
 * deposit was paid. Returns "" unless the input is a positive whole number.
 */
export function normalizePickNumber(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v).trim().replace(/^#/, "");
  if (!/^\d{1,3}$/.test(s)) return "";
  const n = Number(s);
  return Number.isInteger(n) && n > 0 ? String(n) : "";
}

export function buildPrefillValues(
  fields: PrefillStaffFields
): Record<PrefillFieldKey, string> {
  const litterPuppy = formatLitterPuppy(fields.litter, fields.puppy);
  const place = normalizePickNumber(fields.place);
  const price = String(fields.price ?? "").trim() || "TBD";
  const depositMethod = formatDepositMethodValue(
    fields.depositMethod,
    fields.depositAmount
  );
  return {
    litterPuppy: litterPuppy || "—",
    place: place || "—",
    price,
    depositMethod: depositMethod || "—",
  };
}

function isRequiredTrue(v: string | boolean | undefined): boolean {
  return v === true || String(v).toLowerCase() === "true";
}

function sortPrefillByPosition(
  tabs: EnvelopePrefillTextTab[]
): EnvelopePrefillTextTab[] {
  return [...tabs].sort((a, b) => {
    const y = Number(a.yPosition || 0) - Number(b.yPosition || 0);
    if (Math.abs(y) > 4) return y;
    return Number(a.xPosition || 0) - Number(b.xPosition || 0);
  });
}

/**
 * Map staff values → PUT payload using envelope tabIds (new each create).
 * Prefer known template tabLabels; else required tabs sorted y→x.
 */
export function mapPrefillTabsForPut(
  envelopeTabs: EnvelopePrefillTextTab[],
  fields: PrefillStaffFields,
  knownLabels?: Record<PrefillFieldKey, string> | null
): { tabId: string; value: string }[] {
  const values = buildPrefillValues(fields);
  const out: { tabId: string; value: string }[] = [];
  const usedTabIds = new Set<string>();
  const usedKeys = new Set<PrefillFieldKey>();

  if (knownLabels) {
    for (const key of PREFILL_FIELD_ORDER) {
      const label = knownLabels[key];
      const tab = envelopeTabs.find(
        (t) =>
          t.tabId &&
          !usedTabIds.has(String(t.tabId)) &&
          String(t.tabLabel || "") === label
      );
      if (tab?.tabId) {
        out.push({ tabId: String(tab.tabId), value: values[key] });
        usedTabIds.add(String(tab.tabId));
        usedKeys.add(key);
      }
    }
  }

  if (usedKeys.size < PREFILL_FIELD_ORDER.length) {
    const required = sortPrefillByPosition(
      envelopeTabs.filter(
        (t) => t.tabId && isRequiredTrue(t.required) && !usedTabIds.has(String(t.tabId))
      )
    );
    const needKeys = PREFILL_FIELD_ORDER.filter((k) => !usedKeys.has(k));
    for (let i = 0; i < needKeys.length && i < required.length; i++) {
      out.push({
        tabId: String(required[i].tabId),
        value: values[needKeys[i]],
      });
    }
  }

  return out;
}
