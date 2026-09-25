/**
 * LEGACY: DocuSign, inactive on the `signwell` branch unless ESIGN_PROVIDER=docusign.
 *
 * Thin adapter so the UI can show DocuSign connection state through the same
 * EsignConnection shape. The DocuSign implementation itself is unchanged and
 * lives in:
 *   - src/lib/docusign.ts                  (JWT + envelope create/prefill/send)
 *   - src/lib/docusign-prefill-tabs.ts     (sender prefill tab mapping)
 *   - src/lib/docusign-template-tabs.ts    (buyer address tabs)
 *   - src/app/api/docusign/send/route.ts           (reservation send)
 *   - src/app/api/docusign/send-customer/route.ts  (customer Send contract)
 *   - src/components/DocuSignButton.tsx
 */

import { getDocuSignConfig, isDocuSignConfigured } from "@/lib/docusign";
import type { EsignConnection } from "@/lib/esign/types";

export function docuSignConnection(): EsignConnection {
  const cfg = getDocuSignConfig();
  const configured = isDocuSignConfigured(cfg);
  const missing: string[] = [];
  if (!cfg.integrationKey) missing.push("DOCUSIGN_INTEGRATION_KEY");
  if (!cfg.userId) missing.push("DOCUSIGN_USER_ID");
  if (!cfg.accountId) missing.push("DOCUSIGN_ACCOUNT_ID");
  if (!cfg.privateKeyPem && !cfg.privateKeyPath) missing.push("DOCUSIGN_PRIVATE_KEY");
  // Mock mode "sends" without credentials (never calls DocuSign)
  const connected = configured || cfg.mode === "mock";
  return {
    provider: "docusign",
    label: "DocuSign",
    connected,
    templates: { goldendoodle: connected, bernedoodle: connected },
    missing,
    message: connected
      ? `DocuSign (legacy) ${cfg.mode} mode.`
      : `DocuSign (legacy) not configured: ${missing.join(", ")}.`,
    sendCustomerEndpoint: "/api/docusign/send-customer",
    sendReservationEndpoint: "/api/docusign/send",
  };
}
