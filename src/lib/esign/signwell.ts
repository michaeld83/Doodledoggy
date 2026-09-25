/**
 * SignWell provider (ACTIVE on the `signwell` branch).
 *
 * REST API: https://developers.signwell.com — auth via `X-Api-Key` header.
 *  - Send from template:   POST /api/v1/document_templates/documents
 *  - Template details:     GET  /api/v1/document_templates/{id}
 *  - Document status:      GET  /api/v1/documents/{id}
 *  - Completed PDF:        GET  /api/v1/documents/{id}/completed_pdf
 *  - Webhook event hash:   HMAC-SHA256(key = webhook id, data = "<event.type>@<event.time>")
 *
 * Never logs or returns the API key.
 */

import { createHmac, timingSafeEqual } from "crypto";
import type {
  ContractTemplateKey,
  EsignConnection,
  EsignSendInput,
  EsignSendResult,
} from "@/lib/esign/types";
import {
  SIGNWELL_BUYER_PLACEHOLDER,
  buildTemplateFieldsPayload,
} from "@/lib/esign/fields";

export type SignWellConfig = {
  apiKey: string;
  apiBase: string;
  templates: Record<ContractTemplateKey, string>;
  webhookSecret: string;
  testMode: boolean;
  ccEmails: string[];
};

export function getSignWellConfig(): SignWellConfig {
  const testRaw = (process.env.SIGNWELL_TEST_MODE ?? "true").trim().toLowerCase();
  return {
    apiKey: (process.env.SIGNWELL_API_KEY || "").trim(),
    apiBase: (process.env.SIGNWELL_API_BASE || "https://www.signwell.com/api/v1").replace(/\/$/, ""),
    templates: {
      goldendoodle: (process.env.SIGNWELL_TEMPLATE_GOLDENDOODLE || "").trim(),
      bernedoodle: (process.env.SIGNWELL_TEMPLATE_BERNEDOODLE || "").trim(),
    },
    webhookSecret: (process.env.SIGNWELL_WEBHOOK_SECRET || "").trim(),
    // Test mode unless explicitly "false" (test docs are free and not legally binding)
    testMode: !(testRaw === "false" || testRaw === "0" || testRaw === "no"),
    ccEmails: (process.env.SIGNWELL_CC_EMAILS || "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean),
  };
}

export function signWellConnection(cfg = getSignWellConfig()): EsignConnection {
  const missing: string[] = [];
  if (!cfg.apiKey) missing.push("SIGNWELL_API_KEY");
  if (!cfg.templates.goldendoodle) missing.push("SIGNWELL_TEMPLATE_GOLDENDOODLE");
  if (!cfg.templates.bernedoodle) missing.push("SIGNWELL_TEMPLATE_BERNEDOODLE");
  const connected = Boolean(cfg.apiKey);
  const templates = {
    goldendoodle: connected && Boolean(cfg.templates.goldendoodle),
    bernedoodle: connected && Boolean(cfg.templates.bernedoodle),
  };
  let message = "";
  if (!connected) {
    message =
      "SignWell not connected — contracts can't be sent yet. Add SIGNWELL_API_KEY and the SignWell template IDs (see docs/SIGNWELL-SETUP.md).";
  } else if (!templates.goldendoodle || !templates.bernedoodle) {
    message = `SignWell connected, but template ID missing: ${missing.join(", ")}.`;
  } else {
    message = cfg.testMode
      ? "SignWell connected (test mode — documents are free and not legally binding)."
      : "SignWell connected (live).";
  }
  return {
    provider: "signwell",
    label: "SignWell",
    connected,
    templates,
    missing,
    message,
    testMode: cfg.testMode,
    sendCustomerEndpoint: "/api/esign/send-customer",
    sendReservationEndpoint: "/api/esign/send",
  };
}

type SwResponse = {
  ok: boolean;
  status: number;
  json: Record<string, unknown>;
  raw: string;
};

async function swFetch(
  cfg: SignWellConfig,
  path: string,
  init?: { method?: string; body?: unknown }
): Promise<SwResponse> {
  const res = await fetch(`${cfg.apiBase}${path}`, {
    method: init?.method || "GET",
    headers: {
      "X-Api-Key": cfg.apiKey,
      Accept: "application/json",
      ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const raw = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    /* keep raw */
  }
  return { ok: res.ok, status: res.status, json, raw };
}

function errorText(r: SwResponse): string {
  const j = r.json;
  const parts: string[] = [];
  if (j.message) parts.push(String(j.message));
  if (j.error) parts.push(typeof j.error === "string" ? j.error : JSON.stringify(j.error));
  if (j.errors) parts.push(JSON.stringify(j.errors));
  const t = parts.join(" ") || r.raw || `HTTP ${r.status}`;
  return t.slice(0, 800);
}

/** Flatten SignWell's 2-D `fields` array into api_ids. */
function collectApiIds(fields: unknown): Set<string> {
  const ids = new Set<string>();
  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      const id = (v as { api_id?: unknown }).api_id;
      if (typeof id === "string" && id) ids.add(id);
    }
  };
  walk(fields);
  return ids;
}

export type SignWellTemplateInfo = {
  ok: boolean;
  error?: string;
  apiIds: Set<string>;
  placeholders: string[];
};

export async function getSignWellTemplate(
  templateId: string,
  cfg = getSignWellConfig()
): Promise<SignWellTemplateInfo> {
  const r = await swFetch(cfg, `/document_templates/${encodeURIComponent(templateId)}`);
  if (!r.ok) {
    return { ok: false, error: `SignWell template lookup failed (${r.status}): ${errorText(r)}`, apiIds: new Set(), placeholders: [] };
  }
  const placeholders = Array.isArray(r.json.placeholders)
    ? (r.json.placeholders as { name?: string }[]).map((p) => String(p.name || "")).filter(Boolean)
    : [];
  return { ok: true, apiIds: collectApiIds(r.json.fields), placeholders };
}

function pickPlaceholder(placeholders: string[]): string {
  const want = SIGNWELL_BUYER_PLACEHOLDER.toLowerCase();
  const exact = placeholders.find((p) => p.toLowerCase() === want);
  if (exact) return exact;
  if (placeholders.length === 1) return placeholders[0];
  return SIGNWELL_BUYER_PLACEHOLDER;
}

/** Create + send a document from the Goldendoodle/Bernedoodle template. */
export async function sendSignWellFromTemplate(
  input: EsignSendInput,
  cfg = getSignWellConfig()
): Promise<EsignSendResult> {
  const conn = signWellConnection(cfg);
  const templateId = cfg.templates[input.templateKey] || null;
  const base = { provider: "signwell" as const, templateId, testMode: cfg.testMode };

  if (!conn.connected || !templateId) {
    return {
      ...base,
      ok: false,
      documentId: null,
      status: "NOT_CONNECTED",
      message: conn.connected
        ? `SignWell template ID for ${input.templateKey} is not set (${input.templateKey === "goldendoodle" ? "SIGNWELL_TEMPLATE_GOLDENDOODLE" : "SIGNWELL_TEMPLATE_BERNEDOODLE"}).`
        : conn.message,
    };
  }
  if (!input.buyerName?.trim() || !input.buyerEmail?.trim()) {
    return { ...base, ok: false, documentId: null, status: "VALIDATION_ERROR", message: "Buyer name and email are required." };
  }

  // Read template to learn its field api_ids + placeholder (role) name.
  const tpl = await getSignWellTemplate(templateId, cfg);
  if (!tpl.ok) {
    return { ...base, ok: false, documentId: null, status: "TEMPLATE_ERROR", message: tpl.error || "Template lookup failed" };
  }
  const tf = buildTemplateFieldsPayload(input, tpl.apiIds);
  if (tf.missingRequired.length > 0) {
    return {
      ...base,
      ok: false,
      documentId: null,
      status: "TEMPLATE_FIELDS_MISSING",
      message: `SignWell template is missing field API IDs: ${tf.missingRequired.join(", ")}. Add text fields with these API IDs (see docs/SIGNWELL-SETUP.md). Nothing was sent.`,
      fieldsApplied: [],
      fieldsSkipped: tf.skipped,
    };
  }

  const body: Record<string, unknown> = {
    test_mode: cfg.testMode,
    template_id: templateId,
    name: input.documentName || input.subject || `Puppy Contract — ${input.buyerName}`,
    ...(input.subject ? { subject: input.subject } : {}),
    ...(input.message ? { message: input.message } : {}),
    draft: false,
    recipients: [
      {
        id: "1",
        name: input.buyerName.trim(),
        email: input.buyerEmail.trim(),
        placeholder_name: pickPlaceholder(tpl.placeholders),
      },
    ],
    template_fields: tf.fields,
    ...(input.metadata ? { metadata: input.metadata } : {}),
    ...(cfg.ccEmails.length ? { copied_contacts: cfg.ccEmails.map((email) => ({ email })) } : {}),
  };

  const r = await swFetch(cfg, "/document_templates/documents", { method: "POST", body });
  if (!r.ok) {
    return {
      ...base,
      ok: false,
      documentId: null,
      status: `API_ERROR_${r.status}`,
      message: `SignWell send failed (${r.status}): ${errorText(r)}`,
      fieldsApplied: tf.applied,
      fieldsSkipped: tf.skipped,
    };
  }
  const documentId = String(r.json.id || "") || null;
  const status = String(r.json.status || "sent").toLowerCase();
  return {
    ...base,
    ok: Boolean(documentId),
    documentId,
    status,
    message: `SignWell document sent to ${input.buyerEmail.trim()}${cfg.testMode ? " (test mode)" : ""}; fields filled: ${tf.applied.join(", ")}.`,
    fieldsApplied: tf.applied,
    fieldsSkipped: tf.skipped,
  };
}

export type SignWellDocumentStatus = {
  ok: boolean;
  status: string;
  error?: string;
  completedAt?: string | null;
  raw?: Record<string, unknown>;
};

export async function getSignWellDocument(
  documentId: string,
  cfg = getSignWellConfig()
): Promise<SignWellDocumentStatus> {
  if (!cfg.apiKey) return { ok: false, status: "NOT_CONNECTED", error: "SIGNWELL_API_KEY not set" };
  const r = await swFetch(cfg, `/documents/${encodeURIComponent(documentId)}`);
  if (!r.ok) return { ok: false, status: `API_ERROR_${r.status}`, error: errorText(r) };
  return {
    ok: true,
    status: String(r.json.status || "").toLowerCase(),
    completedAt: (r.json.completed_at as string) || null,
    raw: r.json,
  };
}

/** Download completed PDF bytes (with audit page). */
export async function downloadSignWellCompletedPdf(
  documentId: string,
  cfg = getSignWellConfig()
): Promise<{ ok: true; bytes: ArrayBuffer; contentType: string } | { ok: false; status: number; error: string }> {
  if (!cfg.apiKey) return { ok: false, status: 503, error: "SignWell not connected (SIGNWELL_API_KEY missing)." };
  const url = `${cfg.apiBase}/documents/${encodeURIComponent(documentId)}/completed_pdf?audit_page=true`;
  const res = await fetch(url, {
    headers: { "X-Api-Key": cfg.apiKey, Accept: "application/pdf, application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const t = (await res.text()).slice(0, 500);
    return {
      ok: false,
      status: res.status,
      error: res.status === 404 ? "Completed PDF not available yet (document not completed or not found)." : `SignWell PDF download failed (${res.status}): ${t}`,
    };
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    // url_only style response → follow file_url
    const j = (await res.json()) as { file_url?: string };
    if (!j.file_url) return { ok: false, status: 502, error: "SignWell returned no PDF." };
    const f = await fetch(j.file_url, { cache: "no-store" });
    if (!f.ok) return { ok: false, status: f.status, error: `PDF file fetch failed (${f.status})` };
    return { ok: true, bytes: await f.arrayBuffer(), contentType: f.headers.get("content-type") || "application/pdf" };
  }
  return { ok: true, bytes: await res.arrayBuffer(), contentType: ct || "application/pdf" };
}

/**
 * Verify SignWell webhook event hash.
 * key = webhook ID (store it as SIGNWELL_WEBHOOK_SECRET), data = `${type}@${time}`.
 */
export function verifySignWellEventHash(
  event: { type?: unknown; time?: unknown; hash?: unknown } | null | undefined,
  secret: string
): boolean {
  if (!event || !secret) return false;
  const type = String(event.type ?? "");
  const time = String(event.time ?? "");
  const hash = String(event.hash ?? "");
  if (!type || !time || !/^[0-9a-f]{64}$/i.test(hash)) return false;
  const calc = createHmac("sha256", secret).update(`${type}@${time}`).digest("hex");
  const a = Buffer.from(calc, "hex");
  const b = Buffer.from(hash.toLowerCase(), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Map SignWell document status / event type → app Contract status.
 * SignWell statuses: Created, Sent, Viewed, Pending (in progress), Completed,
 * Expired, Canceled, Declined.
 */
export function contractStatusFromSignWell(statusOrEvent: string): "SENT" | "SIGNED" | "CANCELLED" | null {
  const s = statusOrEvent.toLowerCase().replace(/^document_/, "");
  if (s === "completed") return "SIGNED";
  if (["canceled", "cancelled", "declined", "expired"].includes(s)) return "CANCELLED";
  if (["sent", "viewed", "pending", "in_progress", "signed", "created", "recipients_updated"].includes(s)) return "SENT";
  return null;
}
