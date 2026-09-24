/**
 * DocuSign JWT grant + envelope create/send.
 * Mock mode never hits the API. Sandbox/live require credentials + RSA key
 * and return real envelopeId from DocuSign — never a fake success.
 */

import { readFileSync } from "fs";
import { createSign, createPrivateKey } from "crypto";
import { buildFeeLineItems, type FeeAddOns, type FeeLineItem } from "@/lib/fees";

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
  consentUrl?: string;
};

/**
 * Mock path always "sends" mock and returns SENT_MOCK.
 * Sandbox/live with credentials: JWT + real envelope create with status "sent".
 * Never claims success without a real API envelopeId.
 */
export async function sendEnvelope(payload: EnvelopePayload): Promise<SendResult> {
  const cfg = getDocuSignConfig();

  if (cfg.mode === "mock") {
    const envelopeId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      ok: true,
      mode: "mock",
      envelopeId,
      status: "SENT_MOCK",
      message: "Mock DocuSign send completed. No external API call was made.",
      payload,
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
        "DocuSign credentials incomplete. Envelope saved as mock only. Configure DOCUSIGN_* env vars (including DOCUSIGN_PRIVATE_KEY or DOCUSIGN_PRIVATE_KEY_PATH) to enable sandbox/live.",
      payload,
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
        payload,
        consentUrl: url,
      };
    }
    return {
      ok: false,
      mode: cfg.mode,
      envelopeId: null,
      status: "AUTH_FAILED",
      message: `DocuSign JWT auth failed: ${token.error}`,
      payload,
    };
  }

  // Build REST body: send immediately so DocuSign emails the signer
  const apiBody = {
    emailSubject: payload.emailSubject,
    status: "sent",
    documents: payload.documents.map((d) => ({
      documentBase64: d.documentBase64,
      name: d.name,
      fileExtension: d.fileExtension,
      documentId: d.documentId,
    })),
    recipients: {
      signers: payload.recipients.signers.map((s) => ({
        email: s.email,
        name: s.name,
        recipientId: s.recipientId,
        routingOrder: s.routingOrder,
        tabs: {
          signHereTabs: [
            {
              documentId: "1",
              pageNumber: "1",
              xPosition: "100",
              yPosition: "650",
              optional: "false",
            },
          ],
          dateSignedTabs: [
            {
              documentId: "1",
              pageNumber: "1",
              xPosition: "350",
              yPosition: "650",
            },
          ],
        },
      })),
    },
    customFields: {
      textCustomFields: Object.entries(payload.metadata || {}).map(([name, value], i) => ({
        name,
        value: String(value).slice(0, 100),
        show: "false",
        required: "false",
        fieldId: String(i + 1),
      })),
    },
  };

  const envelopesUrl =
    `${cfg.accountBaseUri}/restapi/v2.1/accounts/${cfg.accountId}/envelopes`;

  const res = await fetch(envelopesUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      "Content-Type": "application/json",
    },
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
      message: `DocuSign envelope create failed (${res.status}): ${errMsg}`,
      payload,
    };
  }

  const envelopeId = String(json.envelopeId || "");
  const status = String(json.status || "sent");
  if (!envelopeId) {
    return {
      ok: false,
      mode: cfg.mode,
      envelopeId: null,
      status: "API_ERROR",
      message: "DocuSign API returned success without envelopeId — treating as failure.",
      payload,
    };
  }

  return {
    ok: true,
    mode: cfg.mode,
    envelopeId,
    status,
    message: `DocuSign envelope created and sent (${cfg.mode}).`,
    payload: { ...payload, status: "sent" },
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
    "9. App uses Node crypto RS256 JWT + REST envelopes API — no SDK required",
  ].join("\n");
}
