/**
 * DocuSign stub: builds envelope payloads and supports mock/sandbox path.
 * Does NOT fake successful live sends — live mode requires real credentials
 * and will return a clear "not sent" / configuration-needed response.
 */

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
};

export type DocuSignConfig = {
  integrationKey: string;
  userId: string;
  accountId: string;
  authServer: string;
  privateKeyPath: string;
  mode: "mock" | "sandbox" | "live";
};

export function getDocuSignConfig(): DocuSignConfig {
  return {
    integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY || "",
    userId: process.env.DOCUSIGN_USER_ID || "",
    accountId: process.env.DOCUSIGN_ACCOUNT_ID || "",
    authServer: process.env.DOCUSIGN_AUTH_SERVER || "https://account-d.docusign.com",
    privateKeyPath: process.env.DOCUSIGN_PRIVATE_KEY_PATH || "",
    mode: (process.env.DOCUSIGN_MODE as DocuSignConfig["mode"]) || "mock",
  };
}

export function isDocuSignConfigured(cfg = getDocuSignConfig()): boolean {
  return Boolean(cfg.integrationKey && cfg.userId && cfg.accountId && cfg.privateKeyPath);
}

export function buildReservationEnvelope(input: {
  buyerName: string;
  buyerEmail: string;
  litterLabel: string;
  depositAmount: number;
  pickPosition?: number | null;
  puppyName?: string | null;
}): EnvelopePayload {
  const text = [
    "Puppy Reservation Agreement — Mini Golden Doodles Georgia",
    "",
    `Buyer: ${input.buyerName}`,
    `Email: ${input.buyerEmail}`,
    `Litter: ${input.litterLabel}`,
    `Puppy: ${input.puppyName || "TBD"}`,
    `Pick position: ${input.pickPosition ?? "TBD"}`,
    `Deposit: $${input.depositAmount.toFixed(2)}`,
    "",
    "By signing, buyer acknowledges deposit terms and pick order.",
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
};

/**
 * Mock path always "sends" to mock and returns SENT_MOCK.
 * Sandbox/live without full JWT setup returns CONFIGURED_PENDING / not sent.
 * We never claim a live DocuSign API success without real credentials + key.
 */
export async function sendEnvelope(payload: EnvelopePayload): Promise<SendResult> {
  const cfg = getDocuSignConfig();

  if (cfg.mode === "mock" || !isDocuSignConfigured(cfg)) {
    const envelopeId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      ok: true,
      mode: cfg.mode === "mock" ? "mock" : "unconfigured",
      envelopeId,
      status: "SENT_MOCK",
      message:
        cfg.mode === "mock"
          ? "Mock DocuSign send completed. No external API call was made."
          : "DocuSign credentials incomplete. Envelope saved as mock only. Configure DOCUSIGN_* env vars and JWT/OAuth to enable sandbox/live.",
      payload,
    };
  }

  // Sandbox/live: document required setup; do not fake a successful live send
  return {
    ok: false,
    mode: cfg.mode,
    envelopeId: null,
    status: "CONFIGURED_PENDING",
    message:
      "DocuSign credentials detected, but live JWT grant / API send is not executed in this stub. " +
      "Place your RSA private key at DOCUSIGN_PRIVATE_KEY_PATH, enable JWT impersonation for the integration key, " +
      "then wire docusign-esign SDK. Payload has been built and is ready — no live envelope was created.",
    payload,
  };
}

export function docusignSetupGuide(): string {
  return [
    "1. Create a DocuSign developer (sandbox) account at https://developers.docusign.com",
    "2. Create an Integration (JWT Grant) and note Integration Key (client ID)",
    "3. Generate RSA keypair; upload public key to DocuSign; store private key on disk",
    "4. Set DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_USER_ID, DOCUSIGN_ACCOUNT_ID",
    "5. Set DOCUSIGN_PRIVATE_KEY_PATH to the private key file",
    "6. Set DOCUSIGN_AUTH_SERVER=https://account-d.docusign.com (sandbox) or https://account.docusign.com (live)",
    "7. Set DOCUSIGN_MODE=sandbox (or live). Consent the app once via DocuSign JWT consent URL",
    "8. Install docusign-esign and implement token grant — this app builds payloads and mock-sends only until then",
  ].join("\n");
}
