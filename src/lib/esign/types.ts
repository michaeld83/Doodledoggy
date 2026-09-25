/**
 * E-signature provider types shared by SignWell (active) and DocuSign (legacy).
 */

export type EsignProviderId = "signwell" | "docusign";
export type ContractTemplateKey = "goldendoodle" | "bernedoodle";

/** Staff-entered contract data (same fields for every provider). */
export type ContractFields = {
  templateKey: ContractTemplateKey;
  buyerName: string;
  buyerEmail: string;
  litter?: string | null;
  puppy?: string | null;
  /** Pick number from the reservation, e.g. "3" (not where the deposit was paid). */
  place?: string | number | null;
  /** Defaults to "TBD". */
  price?: string | null;
  depositMethod?: string | null;
  depositAmount?: number | string | null;
  /** Optional buyer address/phone (filled only when on file). */
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  phone?: string | null;
};

export type EsignSendInput = ContractFields & {
  documentName?: string;
  subject?: string;
  message?: string;
  metadata?: Record<string, string>;
};

export type EsignSendResult = {
  ok: boolean;
  provider: EsignProviderId;
  /** Provider document/envelope id (stored in Contract.docusignEnvelopeId). */
  documentId: string | null;
  /** Provider status, lower-case (e.g. "sent", "completed") or an error code. */
  status: string;
  message: string;
  templateId: string | null;
  testMode?: boolean;
  fieldsApplied?: string[];
  fieldsSkipped?: string[];
};

/** Connection state used by UI to enable/disable Send contract. */
export type EsignConnection = {
  provider: EsignProviderId;
  /** Human label, e.g. "SignWell". */
  label: string;
  /** API credentials present (templates may still be missing). */
  connected: boolean;
  /** Per-template availability. */
  templates: Record<ContractTemplateKey, boolean>;
  /** Env var names that are missing (names only, never values). */
  missing: string[];
  /** Plain explanation shown next to a disabled Send button. */
  message: string;
  testMode?: boolean;
  /** Endpoints the UI should POST to. */
  sendCustomerEndpoint: string;
  sendReservationEndpoint: string;
};

export function canSendTemplate(
  conn: EsignConnection,
  key: string | null | undefined
): { ok: boolean; reason: string } {
  if (!conn.connected) return { ok: false, reason: conn.message };
  const k = String(key || "").toLowerCase();
  if (k === "goldendoodle" || k === "bernedoodle") {
    if (!conn.templates[k]) {
      return {
        ok: false,
        reason: `${conn.label} template for ${k === "goldendoodle" ? "Goldendoodle" : "Bernedoodle"} is not set up yet (${conn.missing.join(", ") || "template ID missing"}).`,
      };
    }
    return { ok: true, reason: "" };
  }
  // Unknown/auto (reservation uses litter breed): ok if any template exists
  if (!conn.templates.goldendoodle && !conn.templates.bernedoodle) {
    return { ok: false, reason: conn.message };
  }
  return { ok: true, reason: "" };
}
