/**
 * E-signature provider switch.
 *
 *   ESIGN_PROVIDER=signwell  (default on this branch) → src/lib/esign/signwell.ts
 *   ESIGN_PROVIDER=docusign  (legacy)                 → src/lib/docusign.ts via /api/docusign/*
 */

import type { EsignConnection, EsignProviderId } from "@/lib/esign/types";
import { signWellConnection } from "@/lib/esign/signwell";
import { docuSignConnection } from "@/lib/esign/legacy-docusign/connection";

export * from "@/lib/esign/types";

export function getEsignProviderId(): EsignProviderId {
  const raw = (process.env.ESIGN_PROVIDER || "signwell").trim().toLowerCase();
  return raw === "docusign" ? "docusign" : "signwell";
}

/** Env-only check (no network). Safe to call from server components. */
export function getEsignConnection(): EsignConnection {
  try {
    return getEsignProviderId() === "docusign" ? docuSignConnection() : signWellConnection();
  } catch (e) {
    return {
      provider: getEsignProviderId(),
      label: getEsignProviderId() === "docusign" ? "DocuSign" : "SignWell",
      connected: false,
      templates: { goldendoodle: false, bernedoodle: false },
      missing: [],
      message: `E-sign configuration error: ${e instanceof Error ? e.message : String(e)}`,
      sendCustomerEndpoint: "/api/esign/send-customer",
      sendReservationEndpoint: "/api/esign/send",
    };
  }
}
