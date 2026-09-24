/**
 * JWT create+prefill+send smoke test (Bernedoodle).
 * Loads project .env + /home/box/.config/doodledoggy/docusign.env (no secret prints).
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import {
  sendEnvelope,
  getDocuSignConfig,
  isDocuSignConfigured,
  type EnvelopePayload,
} from "../src/lib/docusign";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

async function main() {
  const root = resolve(__dirname, "..");
  loadEnvFile(resolve(root, ".env"));
  loadEnvFile(resolve(root, ".env.local"));
  loadEnvFile("/home/box/.config/doodledoggy/docusign.env");
  // Prefer sandbox key path from config if present
  if (
    process.env.DOCUSIGN_PRIVATE_KEY_PATH &&
    !process.env.DOCUSIGN_PRIVATE_KEY_PATH.startsWith("/")
  ) {
    process.env.DOCUSIGN_PRIVATE_KEY_PATH = resolve(
      root,
      process.env.DOCUSIGN_PRIVATE_KEY_PATH
    );
  }
  // Also try absolute config key
  const cfgKey = "/home/box/.config/doodledoggy/docusign_private.key";
  if (existsSync(cfgKey) && !existsSync(process.env.DOCUSIGN_PRIVATE_KEY_PATH || "")) {
    process.env.DOCUSIGN_PRIVATE_KEY_PATH = cfgKey;
  }

  if (process.env.DOCUSIGN_MODE === "mock") {
    process.env.DOCUSIGN_MODE = "sandbox";
  }

  const cfg = getDocuSignConfig();
  console.log(
    JSON.stringify({
      mode: cfg.mode,
      configured: isDocuSignConfigured(cfg),
      hasIntegrationKey: Boolean(cfg.integrationKey),
      hasUserId: Boolean(cfg.userId),
      hasAccountId: Boolean(cfg.accountId),
      hasPrivateKey: Boolean(cfg.privateKeyPem || cfg.privateKeyPath),
      authServer: cfg.authServer,
      accountBaseUri: cfg.accountBaseUri,
    })
  );

  const payload: EnvelopePayload = {
    emailSubject: "Verify prefill+send — Bernedoodle",
    recipients: {
      signers: [
        {
          email: "test-buyer-doodledoggy@example.com",
          name: "Test Buyer",
          recipientId: "1",
          routingOrder: "1",
        },
      ],
    },
    documents: [],
    status: "created",
    metadata: { source: "verify-prefill-send" },
  };

  const result = await sendEnvelope(payload, {
    templateKey: "bernedoodle",
    prefillFields: {
      litter: "Spring Litter",
      puppy: "Red",
      price: "TBD",
      place: "Farm",
      depositMethod: "VENMO",
      depositAmount: 1200,
    },
  });

  console.log(
    JSON.stringify({
      ok: result.ok,
      status: result.status,
      envelopeId: result.envelopeId,
      mode: result.mode,
      templateId: result.templateId,
      breedFamily: result.breedFamily,
      tabsApplied: result.tabsApplied,
      prefillTabsApplied: result.prefillTabsApplied,
      message: result.message,
    })
  );

  if (!result.ok || !result.envelopeId) {
    process.exit(1);
  }
  // Expect sent-like status
  if (!/sent/i.test(result.status) && result.status !== "SENT_MOCK") {
    console.error("Unexpected status", result.status);
    process.exit(1);
  }
  console.log("VERIFY_OK");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
