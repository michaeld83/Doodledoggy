/**
 * LEGACY: DocuSign, inactive on the `signwell` branch (used only when
 * ESIGN_PROVIDER=docusign). Kept intact for rollback — see
 * src/lib/esign/legacy-docusign/README.md. Active provider: src/lib/esign/signwell.ts.
 */
/**
 * DocuSign JWT grant + envelope create/send.
 * Mock mode never hits the API. Sandbox/live require credentials + RSA key
 * and return real envelopeId from DocuSign — never a fake success.
 */

import { readFileSync } from "fs";
import { createSign, createPrivateKey } from "crypto";
import { buildFeeLineItems, type FeeAddOns, type FeeLineItem } from "@/lib/fees";
import { BREED_TYPES } from "@/lib/utils";
import {
  type AddressFields,
  type TemplateFamily,
  buildAddressEmailBlurb,
  buildBuyerAddressTextTabs,
  familyFromTemplateId,
  mapAddressLabelsFromLiveTabs,
  resolveAddressTabLabels,
  type DocuSignTextTab,
} from "@/lib/docusign-template-tabs";
import {
  type PrefillStaffFields,
  mapPrefillTabsForPut,
  resolvePrefillTabLabels,
  type EnvelopePrefillTextTab,
} from "@/lib/docusign-prefill-tabs";

/** DocuSign demo template IDs (overridable via env). */
export const DEFAULT_TEMPLATE_GOLDENDOODLE =
  "cb1b6556-d557-4c96-bbae-db7553996865";
export const DEFAULT_TEMPLATE_BERNEDOODLE =
  "9c858314-95a2-4e42-8b98-56e0b3c76bff";

const GOLDENDOODLE_BREEDS = new Set<string>([
  "Mini Golden Doodle",
  "Micro Golden Doodle",
]);
const BERNEDOODLE_BREEDS = new Set<string>([
  "Mini Bernedoodle",
  "Micro Bernedoodle",
  "Munchkin Bernedoodle",
]);

export type TemplateResolveOk = {
  ok: true;
  templateId: string;
  breedFamily: "goldendoodle" | "bernedoodle";
};
export type TemplateResolveErr = { ok: false; error: string };
export type TemplateResolveResult = TemplateResolveOk | TemplateResolveErr;

/**
 * Map litter breedType → DocuSign templateId.
 * Unknown/missing breed returns a clear error (never a wrong template).
 */
export function resolveTemplateId(
  breedType?: string | null
): TemplateResolveResult {
  const raw = (breedType ?? "").trim();
  if (!raw) {
    return {
      ok: false,
      error:
        "Missing breedType — cannot select a DocuSign template. Set the litter breed type first.",
    };
  }
  if (GOLDENDOODLE_BREEDS.has(raw)) {
    return {
      ok: true,
      templateId:
        process.env.DOCUSIGN_TEMPLATE_GOLDENDOODLE?.trim() ||
        DEFAULT_TEMPLATE_GOLDENDOODLE,
      breedFamily: "goldendoodle",
    };
  }
  if (BERNEDOODLE_BREEDS.has(raw)) {
    return {
      ok: true,
      templateId:
        process.env.DOCUSIGN_TEMPLATE_BERNEDOODLE?.trim() ||
        DEFAULT_TEMPLATE_BERNEDOODLE,
      breedFamily: "bernedoodle",
    };
  }
  return {
    ok: false,
    error: `Unknown breedType "${raw}" — no DocuSign template mapping. Expected one of: ${BREED_TYPES.join(", ")}`,
  };
}

export const TEMPLATE_KEYS = ["goldendoodle", "bernedoodle"] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

/**
 * Resolve DocuSign templateId from an explicit staff pick (goldendoodle | bernedoodle).
 * Prefer env DOCUSIGN_TEMPLATE_*; fall back to sandbox defaults.
 */
export function resolveTemplateByKey(
  key?: string | null
): TemplateResolveResult {
  const raw = (key ?? "").trim().toLowerCase();
  if (raw === "goldendoodle") {
    return {
      ok: true,
      templateId:
        process.env.DOCUSIGN_TEMPLATE_GOLDENDOODLE?.trim() ||
        DEFAULT_TEMPLATE_GOLDENDOODLE,
      breedFamily: "goldendoodle",
    };
  }
  if (raw === "bernedoodle") {
    return {
      ok: true,
      templateId:
        process.env.DOCUSIGN_TEMPLATE_BERNEDOODLE?.trim() ||
        DEFAULT_TEMPLATE_BERNEDOODLE,
      breedFamily: "bernedoodle",
    };
  }
  return {
    ok: false,
    error: `Unknown templateKey "${key || ""}" — expected goldendoodle or bernedoodle.`,
  };
}

export type EnvelopePayload = {
  emailSubject: string;
  recipients: {
    signers: {
      email: string;
      name: string;
      recipientId: string;
      routingOrder: string;
    }[];
  };
  documents: {
    documentBase64: string;
    name: string;
    fileExtension: string;
    documentId: string;
  }[];
  status: "created" | "sent";
  metadata: Record<string, string>;
  fees?: {
    lines: FeeLineItem[];
    total: number;
    depositAmount: number;
  };
};

export type DocuSignConfig = {
  integrationKey: string;
  userId: string;
  accountId: string;
  authServer: string;
  accountBaseUri: string;
  privateKeyPath: string;
  /** PEM string from DOCUSIGN_PRIVATE_KEY (Vercel); may be empty if path is used */
  privateKeyPem: string;
  mode: "mock" | "sandbox" | "live";
};

export function getDocuSignConfig(): DocuSignConfig {
  const mode = (process.env.DOCUSIGN_MODE as DocuSignConfig["mode"]) || "mock";
  const defaultBase =
    mode === "live" ? "https://na1.docusign.net" : "https://demo.docusign.net";
  const defaultAuth =
    mode === "live" ? "https://account.docusign.com" : "https://account-d.docusign.com";

  return {
    integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY || "",
    userId: process.env.DOCUSIGN_USER_ID || "",
    accountId: process.env.DOCUSIGN_ACCOUNT_ID || "",
    authServer: process.env.DOCUSIGN_AUTH_SERVER || defaultAuth,
    accountBaseUri: (
      process.env.DOCUSIGN_ACCOUNT_BASE_URI ||
      defaultBase
    ).replace(/\/$/, ""),
    privateKeyPath: process.env.DOCUSIGN_PRIVATE_KEY_PATH || "",
    privateKeyPem: process.env.DOCUSIGN_PRIVATE_KEY || "",
    mode,
  };
}

export function isDocuSignConfigured(cfg = getDocuSignConfig()): boolean {
  const hasKey = Boolean(cfg.privateKeyPem?.trim() || cfg.privateKeyPath?.trim());
  return Boolean(cfg.integrationKey && cfg.userId && cfg.accountId && hasKey);
}

/** Normalize PEM from env (real newlines, escaped \\n, or single-line with spaces). Never log. */
function normalizePem(pem: string): string {
  let s = pem.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1);
  }
  s = s.replace(/\\n/g, "\n");
  // Already multi-line PEM
  if (s.includes("\n") && s.includes("-----BEGIN")) {
    return s;
  }
  // Single-line PEM with spaces between base64 chunks — rebuild standard wrapping
  const beginMatch = s.match(/-----BEGIN ([^-]+)-----/);
  const endMatch = s.match(/-----END ([^-]+)-----/);
  if (beginMatch && endMatch) {
    const label = beginMatch[1];
    const begin = `-----BEGIN ${label}-----`;
    const end = `-----END ${endMatch[1]}-----`;
    const i = s.indexOf(begin);
    const j = s.indexOf(end);
    const body = s.slice(i + begin.length, j).replace(/\s+/g, "");
    const wrapped = body.match(/.{1,64}/g)?.join("\n") || body;
    return `${begin}\n${wrapped}\n${end}\n`;
  }
  return s;
}

function loadPrivateKeyPem(cfg: DocuSignConfig): string {
  if (cfg.privateKeyPem?.trim()) {
    return normalizePem(cfg.privateKeyPem);
  }
  if (cfg.privateKeyPath?.trim()) {
    return readFileSync(cfg.privateKeyPath, "utf8");
  }
  throw new Error("No DocuSign private key: set DOCUSIGN_PRIVATE_KEY or DOCUSIGN_PRIVATE_KEY_PATH");
}

function authHost(authServer: string): string {
  return authServer.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function base64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function buildJwtAssertion(cfg: DocuSignConfig, privateKeyPem: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: cfg.integrationKey,
    sub: cfg.userId,
    aud: authHost(cfg.authServer),
    iat: now,
    exp: now + 3600,
    scope: "signature impersonation",
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedClaims = base64url(JSON.stringify(claims));
  const signingInput = `${encodedHeader}.${encodedClaims}`;

  const keyObject = createPrivateKey(privateKeyPem);
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(keyObject);

  return `${signingInput}.${base64url(signature)}`;
}

export function consentUrl(cfg = getDocuSignConfig()): string {
  const host = authHost(cfg.authServer) || "account-d.docusign.com";
  const clientId = encodeURIComponent(cfg.integrationKey || "");
  return (
    `https://${host}/oauth/auth?response_type=code` +
    `&scope=signature%20impersonation` +
    `&client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent("https://www.docusign.com")}`
  );
}

type TokenResult =
  | { ok: true; accessToken: string }
  | { ok: false; error: string; consentRequired: boolean };

export async function requestJwtAccessToken(
  cfg = getDocuSignConfig()
): Promise<TokenResult> {
  let privateKeyPem: string;
  try {
    privateKeyPem = loadPrivateKeyPem(cfg);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to load private key",
      consentRequired: false,
    };
  }

  let assertion: string;
  try {
    assertion = buildJwtAssertion(cfg, privateKeyPem);
  } catch (e) {
    return {
      ok: false,
      error: `JWT sign failed: ${e instanceof Error ? e.message : String(e)}`,
      consentRequired: false,
    };
  }

  const tokenUrl = `${cfg.authServer.replace(/\/$/, "")}/oauth/token`;
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const raw = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    /* keep raw */
  }

  if (!res.ok) {
    const errDesc = String(json.error_description || json.error || raw || res.statusText);
    const consentRequired =
      /consent_required/i.test(errDesc) ||
      String(json.error || "") === "consent_required";
    return {
      ok: false,
      error: errDesc,
      consentRequired,
    };
  }

  const accessToken = String(json.access_token || "");
  if (!accessToken) {
    return { ok: false, error: "Token response missing access_token", consentRequired: false };
  }
  return { ok: true, accessToken };
}

export function buildReservationEnvelope(input: {
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string | null;
  litterLabel: string;
  breedType?: string | null;
  depositAmount: number;
  pickPosition?: number | null;
  puppyName?: string | null;
  paymentMethod?: string | null;
  paidWhere?: string | null;
  paid?: boolean;
  addOns?: FeeAddOns;
}): EnvelopePayload {
  const addOns = input.addOns || {
    snugglePuppy: false,
    snugglePuppyAmount: null,
    travelBag: false,
    travelBagAmount: null,
    travelArrangements: false,
    travelArrangementsNotes: null,
    travelArrangementsAmount: null,
    customFees: [],
  };
  const lines = buildFeeLineItems(input.depositAmount, addOns);
  const total = lines.reduce((s, l) => s + l.amount, 0);

  const feeBlock = lines
    .map((l) => {
      const note = l.notes ? ` (${l.notes})` : "";
      return `  - ${l.label}${note}: $${l.amount.toFixed(2)}`;
    })
    .join("\n");

  const text = [
    "Puppy Reservation / Paid Client Agreement — Mini Golden Doodles Georgia",
    "",
    `Buyer: ${input.buyerName}`,
    `Email: ${input.buyerEmail}`,
    `Phone: ${input.buyerPhone || "—"}`,
    `Litter: ${input.litterLabel}`,
    `Breed type: ${input.breedType || "—"}`,
    `Puppy: ${input.puppyName || "TBD"}`,
    `Pick position: ${input.pickPosition ?? "TBD"}`,
    `Payment method: ${input.paymentMethod || "—"}`,
    `Paid where: ${input.paidWhere || "—"}`,
    `Marked paid: ${input.paid ? "Yes" : "No"}`,
    "",
    "Fee breakdown:",
    feeBlock,
    `Total: $${total.toFixed(2)}`,
    "",
    "By signing, buyer acknowledges deposit terms, add-on fees, and pick order.",
    "",
    "Signature: ______________________  Date: __________",
  ].join("\n");

  const documentBase64 = Buffer.from(text, "utf8").toString("base64");

  return {
    emailSubject: `Reservation Agreement — ${input.litterLabel}`,
    recipients: {
      signers: [
        {
          email: input.buyerEmail,
          name: input.buyerName,
          recipientId: "1",
          routingOrder: "1",
        },
      ],
    },
    documents: [
      {
        documentBase64,
        name: "Reservation_Agreement.txt",
        fileExtension: "txt",
        documentId: "1",
      },
    ],
    status: "created",
    metadata: {
      litter: input.litterLabel,
      breedType: input.breedType || "",
      deposit: String(input.depositAmount),
      total: String(total),
      feeLines: JSON.stringify(lines),
    },
    fees: {
      lines,
      total,
      depositAmount: Number(input.depositAmount) || 0,
    },
  };
}

export type SendResult = {
  ok: boolean;
  mode: string;
  envelopeId: string | null;
  status: string;
  message: string;
  payload: EnvelopePayload;
  templateId?: string | null;
  breedFamily?: string | null;
  consentUrl?: string;
  tabsApplied?: number;
  prefillTabsApplied?: number;
};

export type SendEnvelopeOptions = {
  /** Reservation path: map litter breedType → template */
  breedType?: string | null;
  /** Explicit template UUID (highest priority when set) */
  templateId?: string | null;
  /** Staff pick: goldendoodle | bernedoodle */
  templateKey?: string | null;
  /** Purchaser address fields → Buyer textTabs (street/city/state/zip/phone only) */
  addressFields?: AddressFields | null;
  /** Optional email blurb override; defaults to address summary when addressFields set */
  emailBlurb?: string | null;
  /**
   * Staff sender-fill fields → document prefillTabs (litter/puppy, place, price, deposit).
   * Falls back to matching keys on addressFields / payload.metadata when omitted.
   */
  prefillFields?: PrefillStaffFields | null;
};

function resolveSendTemplate(
  options?: SendEnvelopeOptions,
  payload?: EnvelopePayload
): TemplateResolveResult {
  const explicitId = options?.templateId?.trim();
  if (explicitId) {
    const family: TemplateFamily =
      (options?.templateKey as TemplateFamily) ||
      familyFromTemplateId(explicitId) ||
      "goldendoodle";
    // If templateKey provided, prefer its family label; else infer from known IDs
    if (options?.templateKey) {
      const byKey = resolveTemplateByKey(options.templateKey);
      if (byKey.ok) {
        return { ok: true, templateId: explicitId, breedFamily: byKey.breedFamily };
      }
    }
    const inferred = familyFromTemplateId(explicitId);
    return {
      ok: true,
      templateId: explicitId,
      breedFamily: inferred || family,
    };
  }
  if (options?.templateKey) {
    return resolveTemplateByKey(options.templateKey);
  }
  const breedType =
    options?.breedType ?? payload?.metadata?.breedType ?? null;
  return resolveTemplateId(breedType);
}

async function fetchBuyerTextTabs(
  cfg: DocuSignConfig,
  accessToken: string,
  templateId: string
): Promise<DocuSignTextTab[]> {
  try {
    const recipientsUrl =
      `${cfg.accountBaseUri}/restapi/v2.1/accounts/${cfg.accountId}/templates/${templateId}/recipients`;
    const recRes = await fetch(recipientsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!recRes.ok) return [];
    const recJson = (await recRes.json()) as {
      signers?: { recipientId?: string; roleName?: string }[];
    };
    const buyer =
      (recJson.signers || []).find((s) => s.roleName === "Buyer") ||
      (recJson.signers || [])[0];
    if (!buyer?.recipientId) return [];
    const tabsUrl =
      `${cfg.accountBaseUri}/restapi/v2.1/accounts/${cfg.accountId}/templates/${templateId}/recipients/${buyer.recipientId}/tabs`;
    const tabsRes = await fetch(tabsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!tabsRes.ok) return [];
    const tabsJson = (await tabsRes.json()) as { textTabs?: DocuSignTextTab[] };
    return Array.isArray(tabsJson.textTabs) ? tabsJson.textTabs : [];
  } catch {
    return [];
  }
}

/**
 * Mock path always "sends" mock and returns SENT_MOCK (includes resolved templateId).
 * Sandbox/live: create envelope status=created → fill document prefillTabs by envelope
 * tabId → PUT status=sent. Buyer address textTabs optional on create.
 * Prefer explicit templateId / templateKey; fall back to breedType for reservation sends.
 */
export async function sendEnvelope(
  payload: EnvelopePayload,
  options?: SendEnvelopeOptions
): Promise<SendResult> {
  const cfg = getDocuSignConfig();
  const resolved = resolveSendTemplate(options, payload);

  if (!resolved.ok) {
    return {
      ok: false,
      mode: cfg.mode,
      envelopeId: null,
      status: "TEMPLATE_ERROR",
      message: resolved.error,
      payload,
      templateId: null,
      breedFamily: null,
    };
  }

  const { templateId, breedFamily } = resolved;
  const signer = payload.recipients.signers[0];
  if (!signer?.email || !signer?.name) {
    return {
      ok: false,
      mode: cfg.mode,
      envelopeId: null,
      status: "VALIDATION_ERROR",
      message: "Buyer name and email are required for DocuSign template send.",
      payload,
      templateId,
      breedFamily,
    };
  }

  const addressFields: AddressFields | null = options?.addressFields
    ? {
        ...options.addressFields,
        buyerName: options.addressFields.buyerName || signer.name,
        buyerEmail: options.addressFields.buyerEmail || signer.email,
      }
    : null;

  const prefillFields: PrefillStaffFields = {
    litter:
      options?.prefillFields?.litter ??
      addressFields?.litter ??
      payload.metadata?.litter ??
      null,
    puppy:
      options?.prefillFields?.puppy ??
      addressFields?.puppy ??
      payload.metadata?.puppy ??
      null,
    price:
      options?.prefillFields?.price ??
      addressFields?.price ??
      payload.metadata?.price ??
      "TBD",
    place:
      options?.prefillFields?.place ??
      addressFields?.place ??
      payload.metadata?.place ??
      null,
    depositMethod:
      options?.prefillFields?.depositMethod ??
      addressFields?.depositMethod ??
      payload.metadata?.depositMethod ??
      null,
    depositAmount:
      options?.prefillFields?.depositAmount ??
      addressFields?.depositAmount ??
      payload.metadata?.depositAmount ??
      null,
  };

  let addressLabels = resolveAddressTabLabels({
    family: breedFamily,
    templateId,
  });

  const emailBlurb =
    options?.emailBlurb?.trim() ||
    (addressFields ? buildAddressEmailBlurb(addressFields) : "");

  const enrichedPayload: EnvelopePayload = {
    ...payload,
    metadata: {
      ...payload.metadata,
      breedType: String(options?.breedType ?? payload.metadata?.breedType ?? ""),
      templateId,
      breedFamily,
      templateKey: String(options?.templateKey || breedFamily || ""),
      litter: String(prefillFields.litter || ""),
      puppy: String(prefillFields.puppy || ""),
      price: String(prefillFields.price || "TBD"),
      place: String(prefillFields.place || ""),
      depositMethod: String(prefillFields.depositMethod || ""),
      depositAmount: String(prefillFields.depositAmount ?? ""),
      ...(addressFields
        ? {
            street: String(addressFields.street || ""),
            city: String(addressFields.city || ""),
            state: String(addressFields.state || ""),
            zip: String(addressFields.zip || ""),
            phone: String(addressFields.phone || ""),
          }
        : {}),
    },
  };

  if (cfg.mode === "mock") {
    const tabs = addressLabels && addressFields
      ? buildBuyerAddressTextTabs(addressLabels, addressFields)
      : [];
    const envelopeId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      ok: true,
      mode: "mock",
      envelopeId,
      status: "SENT_MOCK",
      message: `Mock DocuSign template send completed (templateId=${templateId}, breedFamily=${breedFamily}, tabs=${tabs.length}, prefill=4). No external API call was made.`,
      payload: enrichedPayload,
      templateId,
      breedFamily,
      tabsApplied: tabs.length,
      prefillTabsApplied: 4,
    };
  }

  if (!isDocuSignConfigured(cfg)) {
    const envelopeId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      ok: true,
      mode: "unconfigured",
      envelopeId,
      status: "SENT_MOCK",
      message:
        `DocuSign credentials incomplete. Envelope saved as mock only (would use templateId=${templateId}). Configure DOCUSIGN_* env vars (including DOCUSIGN_PRIVATE_KEY or DOCUSIGN_PRIVATE_KEY_PATH) to enable sandbox/live.`,
      payload: enrichedPayload,
      templateId,
      breedFamily,
      tabsApplied: 0,
      prefillTabsApplied: 0,
    };
  }

  const token = await requestJwtAccessToken(cfg);
  if (!token.ok) {
    if (token.consentRequired) {
      const url = consentUrl(cfg);
      return {
        ok: false,
        mode: cfg.mode,
        envelopeId: null,
        status: "CONSENT_REQUIRED",
        message:
          `DocuSign JWT consent required. Open this URL once while signed into the DocuSign account, then retry: ${url}`,
        payload: enrichedPayload,
        templateId,
        breedFamily,
        consentUrl: url,
      };
    }
    return {
      ok: false,
      mode: cfg.mode,
      envelopeId: null,
      status: "AUTH_FAILED",
      message: `DocuSign JWT auth failed: ${token.error}`,
      payload: enrichedPayload,
      templateId,
      breedFamily,
    };
  }

  // If no static tab map for this templateId, fetch live Buyer textTabs and map by position
  if (addressFields && !addressLabels) {
    const liveTabs = await fetchBuyerTextTabs(cfg, token.accessToken, templateId);
    addressLabels = mapAddressLabelsFromLiveTabs(liveTabs);
  }

  const textTabs =
    addressLabels && addressFields
      ? buildBuyerAddressTextTabs(addressLabels, addressFields)
      : [];

  const buyerRole: Record<string, unknown> = {
    roleName: "Buyer",
    name: signer.name,
    email: signer.email,
    routingOrder: "1",
  };
  if (textTabs.length > 0) {
    buyerRole.tabs = { textTabs };
  }

  const apiBody: Record<string, unknown> = {
    templateId,
    status: "created",
    emailSubject: payload.emailSubject,
    templateRoles: [buyerRole],
  };
  if (emailBlurb) {
    apiBody.emailBlurb = emailBlurb;
  }

  const authHeaders = {
    Authorization: `Bearer ${token.accessToken}`,
    "Content-Type": "application/json",
  };
  const envelopesUrl =
    `${cfg.accountBaseUri}/restapi/v2.1/accounts/${cfg.accountId}/envelopes`;

  const res = await fetch(envelopesUrl, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(apiBody),
  });

  const raw = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    /* keep raw */
  }

  if (!res.ok) {
    const errMsg =
      String(
        (json.message as string) ||
          (json.errorCode as string) ||
          raw ||
          res.statusText
      ).slice(0, 800);
    return {
      ok: false,
      mode: cfg.mode,
      envelopeId: null,
      status: "API_ERROR",
      message: `DocuSign template envelope create failed (${res.status}): ${errMsg}`,
      payload: enrichedPayload,
      templateId,
      breedFamily,
      tabsApplied: textTabs.length,
      prefillTabsApplied: 0,
    };
  }

  const envelopeId = String(json.envelopeId || "");
  if (!envelopeId) {
    return {
      ok: false,
      mode: cfg.mode,
      envelopeId: null,
      status: "API_ERROR",
      message: "DocuSign API returned success without envelopeId — treating as failure.",
      payload: enrichedPayload,
      templateId,
      breedFamily,
      tabsApplied: textTabs.length,
      prefillTabsApplied: 0,
    };
  }

  const voidDraft = async () => {
    try {
      await fetch(`${envelopesUrl}/${envelopeId}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          status: "voided",
          voidedReason: "Prefill or send failed; discarding draft",
        }),
      });
    } catch {
      /* best-effort */
    }
  };

  // GET documents → pick first non-summary documentId
  const docsRes = await fetch(`${envelopesUrl}/${envelopeId}/documents`, {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });
  const docsRaw = await docsRes.text();
  let docsJson: {
    envelopeDocuments?: { documentId?: string; name?: string; type?: string }[];
  } = {};
  try {
    docsJson = JSON.parse(docsRaw) as typeof docsJson;
  } catch {
    /* keep */
  }
  if (!docsRes.ok) {
    await voidDraft();
    return {
      ok: false,
      mode: cfg.mode,
      envelopeId,
      status: "API_ERROR",
      message: `DocuSign list documents failed (${docsRes.status}): ${docsRaw.slice(0, 400)}`,
      payload: enrichedPayload,
      templateId,
      breedFamily,
      tabsApplied: textTabs.length,
      prefillTabsApplied: 0,
    };
  }

  const doc =
    (docsJson.envelopeDocuments || []).find(
      (d) =>
        d.documentId &&
        d.documentId !== "certificate" &&
        String(d.type || "").toLowerCase() !== "summary"
    ) || (docsJson.envelopeDocuments || [])[0];
  const documentId = String(doc?.documentId || "");
  if (!documentId) {
    await voidDraft();
    return {
      ok: false,
      mode: cfg.mode,
      envelopeId,
      status: "API_ERROR",
      message: "DocuSign envelope has no documentId for prefill tabs.",
      payload: enrichedPayload,
      templateId,
      breedFamily,
      tabsApplied: textTabs.length,
      prefillTabsApplied: 0,
    };
  }

  // GET envelope document tabs → use envelope tabIds (not template tabLabels alone)
  const tabsUrl = `${envelopesUrl}/${envelopeId}/documents/${documentId}/tabs`;
  const tabsGetRes = await fetch(tabsUrl, {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });
  const tabsGetRaw = await tabsGetRes.text();
  let tabsGetJson: {
    prefillTabs?: { textTabs?: EnvelopePrefillTextTab[] };
  } = {};
  try {
    tabsGetJson = JSON.parse(tabsGetRaw) as typeof tabsGetJson;
  } catch {
    /* keep */
  }
  if (!tabsGetRes.ok) {
    await voidDraft();
    return {
      ok: false,
      mode: cfg.mode,
      envelopeId,
      status: "API_ERROR",
      message: `DocuSign get document tabs failed (${tabsGetRes.status}): ${tabsGetRaw.slice(0, 400)}`,
      payload: enrichedPayload,
      templateId,
      breedFamily,
      tabsApplied: textTabs.length,
      prefillTabsApplied: 0,
    };
  }

  const envelopePrefillTabs: EnvelopePrefillTextTab[] = Array.isArray(
    tabsGetJson.prefillTabs?.textTabs
  )
    ? tabsGetJson.prefillTabs!.textTabs!
    : [];

  const knownPrefillLabels = resolvePrefillTabLabels({
    family: breedFamily,
    templateId,
  });
  const prefillPutTabs = mapPrefillTabsForPut(
    envelopePrefillTabs,
    prefillFields,
    knownPrefillLabels
  );

  if (prefillPutTabs.length === 0 && envelopePrefillTabs.some(
    (t) => t.required === true || String(t.required).toLowerCase() === "true"
  )) {
    await voidDraft();
    return {
      ok: false,
      mode: cfg.mode,
      envelopeId,
      status: "PREFILL_INCOMPLETE",
      message:
        "Could not map required DocuSign prefill tabs (litter/puppy, place, price, deposit method). Check template tab layout.",
      payload: enrichedPayload,
      templateId,
      breedFamily,
      tabsApplied: textTabs.length,
      prefillTabsApplied: 0,
    };
  }

  if (prefillPutTabs.length > 0) {
    const putRes = await fetch(tabsUrl, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({ prefillTabs: { textTabs: prefillPutTabs } }),
    });
    const putRaw = await putRes.text();
    if (!putRes.ok) {
      let putJson: Record<string, unknown> = {};
      try {
        putJson = JSON.parse(putRaw) as Record<string, unknown>;
      } catch {
        /* keep */
      }
      const errMsg = String(
        putJson.message || putJson.errorCode || putRaw || putRes.statusText
      ).slice(0, 800);
      await voidDraft();
      return {
        ok: false,
        mode: cfg.mode,
        envelopeId,
        status: "PREFILL_ERROR",
        message: `DocuSign prefill tabs update failed (${putRes.status}): ${errMsg}`,
        payload: enrichedPayload,
        templateId,
        breedFamily,
        tabsApplied: textTabs.length,
        prefillTabsApplied: 0,
      };
    }
  }

  // Send the draft envelope
  const sendRes = await fetch(`${envelopesUrl}/${envelopeId}`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({ status: "sent" }),
  });
  const sendRaw = await sendRes.text();
  let sendJson: Record<string, unknown> = {};
  try {
    sendJson = JSON.parse(sendRaw) as Record<string, unknown>;
  } catch {
    /* keep */
  }

  if (!sendRes.ok) {
    const errCode = String(sendJson.errorCode || "");
    const errMsg = String(
      sendJson.message || errCode || sendRaw || sendRes.statusText
    ).slice(0, 800);
    await voidDraft();
    const friendly =
      /REQUIRED_TAB_INCOMPLETE/i.test(errCode) ||
      /REQUIRED_TAB_INCOMPLETE/i.test(errMsg)
        ? " Required contract fields (litter/puppy, place, price, deposit method) were incomplete after prefill."
        : "";
    return {
      ok: false,
      mode: cfg.mode,
      envelopeId,
      status: errCode || "SEND_ERROR",
      message: `DocuSign send failed (${sendRes.status}): ${errMsg}.${friendly}`,
      payload: enrichedPayload,
      templateId,
      breedFamily,
      tabsApplied: textTabs.length,
      prefillTabsApplied: prefillPutTabs.length,
    };
  }

  const status = String(sendJson.status || "sent");
  return {
    ok: true,
    mode: cfg.mode,
    envelopeId,
    status,
    message: `DocuSign envelope created from ${breedFamily} template and sent (${cfg.mode}; address tabs=${textTabs.length}, prefill tabs=${prefillPutTabs.length}).`,
    payload: { ...enrichedPayload, status: "sent" },
    templateId,
    breedFamily,
    tabsApplied: textTabs.length,
    prefillTabsApplied: prefillPutTabs.length,
  };
}

export function docusignSetupGuide(): string {
  return [
    "1. Create a DocuSign developer (sandbox) account at https://developers.docusign.com",
    "2. Create an Integration (JWT Grant) and note Integration Key (client ID)",
    "3. Generate RSA keypair; upload public key to DocuSign; store private key securely",
    "4. Set DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_USER_ID, DOCUSIGN_ACCOUNT_ID",
    "5. Set DOCUSIGN_PRIVATE_KEY (PEM string, for Vercel) or DOCUSIGN_PRIVATE_KEY_PATH (local file)",
    "6. Set DOCUSIGN_AUTH_SERVER=https://account-d.docusign.com (sandbox) or https://account.docusign.com (live)",
    "7. Set DOCUSIGN_ACCOUNT_BASE_URI=https://demo.docusign.net (sandbox) or your account base URI (live)",
    "8. Set DOCUSIGN_MODE=sandbox (or live). Open the consent URL once (Settings / CONSENT_REQUIRED message)",
    "9. Set DOCUSIGN_TEMPLATE_GOLDENDOODLE / DOCUSIGN_TEMPLATE_BERNEDOODLE (optional overrides)",
    "10. Reservation sends map litter breedType → template; customer Send contract uses explicit templateKey",
    "11. Create status=created → PUT document prefillTabs by envelope tabId → status=sent",
    "12. Prefill: litter/puppy, place, price, deposit method (+ amount); Buyer address tabs optional",
    "13. App uses Node crypto RS256 JWT + REST template envelopes API — no SDK required",
  ].join("\n");
}
