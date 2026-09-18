/**
 * Inquiry helpers for website form / GoDaddy webhook ingest and future email import.
 * No live IMAP or GoDaddy connection — map payloads into Inquiry fields only.
 */

export const INQUIRY_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "ARCHIVED"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const INQUIRY_SOURCES = ["godaddy_form", "email", "manual", "webhook"] as const;
export type InquirySource = (typeof INQUIRY_SOURCES)[number];

export type WebhookInquiryBody = {
  name?: string;
  email?: string;
  phone?: string | null;
  message?: string | null;
  body?: string | null;
  source?: string;
  externalId?: string | null;
  idempotencyKey?: string | null;
  [key: string]: unknown;
};

export type EmailLike = {
  from: string;
  subject?: string | null;
  text?: string | null;
  date?: string | Date | null;
  messageId?: string | null;
};

export type InquiryCreateFields = {
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  source: string;
  externalId: string | null;
  rawPayload: string | null;
  status: InquiryStatus;
};

/** Parse "Name <email@x.com>" or bare email into name + email. */
export function parseFromHeader(from: string): { name: string; email: string } {
  const trimmed = (from || "").trim();
  const match = trimmed.match(/^(?:"?([^"<]*)"?\s*)?<([^>]+)>$/);
  if (match) {
    const email = match[2].trim().toLowerCase();
    const name = (match[1] || "").trim() || email.split("@")[0] || "Unknown";
    return { name, email };
  }
  if (trimmed.includes("@")) {
    return { name: trimmed.split("@")[0] || "Unknown", email: trimmed.toLowerCase() };
  }
  return { name: trimmed || "Unknown", email: "" };
}

/**
 * Map a simple email-like object into Inquiry create fields (stub for future IMAP/import).
 * Not connected to any live mail source.
 */
export function mapEmailToInquiry(email: EmailLike): InquiryCreateFields {
  const { name, email: addr } = parseFromHeader(email.from);
  const subject = (email.subject || "").trim();
  const text = (email.text || "").trim();
  const message = [subject ? `Subject: ${subject}` : null, text || null].filter(Boolean).join("\n\n") || null;

  return {
    name,
    email: addr || "unknown@invalid.local",
    phone: null,
    message,
    source: "email",
    externalId: email.messageId?.trim() || null,
    rawPayload: JSON.stringify({
      from: email.from,
      subject: email.subject ?? null,
      text: email.text ?? null,
      date: email.date ? new Date(email.date).toISOString() : null,
      messageId: email.messageId ?? null,
    }),
    status: "NEW",
  };
}

/**
 * Normalize webhook / form JSON into Inquiry create fields.
 * Accepts name/email/message (or body), optional phone, source, externalId/idempotencyKey.
 */
export function mapWebhookBodyToInquiry(body: WebhookInquiryBody): InquiryCreateFields {
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = body.phone != null && String(body.phone).trim() ? String(body.phone).trim() : null;
  const messageRaw = body.message ?? body.body ?? null;
  const message = messageRaw != null && String(messageRaw).trim() ? String(messageRaw).trim() : null;
  const sourceRaw = String(body.source || "webhook").trim().toLowerCase();
  const source = (INQUIRY_SOURCES as readonly string[]).includes(sourceRaw)
    ? sourceRaw
    : sourceRaw === "godaddy"
      ? "godaddy_form"
      : "webhook";
  const externalId =
    (body.externalId != null && String(body.externalId).trim()) ||
    (body.idempotencyKey != null && String(body.idempotencyKey).trim()) ||
    null;

  return {
    name: name || "Unknown",
    email: email || "unknown@invalid.local",
    phone,
    message,
    source,
    externalId,
    rawPayload: JSON.stringify(body),
    status: "NEW",
  };
}

export function isValidInquiryStatus(s: string): s is InquiryStatus {
  return (INQUIRY_STATUSES as readonly string[]).includes(s);
}
