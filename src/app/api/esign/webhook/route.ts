/**
 * SignWell webhook: POST /api/esign/webhook (public — no session).
 *
 * Verifies event.hash = HMAC-SHA256(key = SIGNWELL_WEBHOOK_SECRET [the webhook ID],
 * data = "<event.type>@<event.time>") when the secret is set. Without the secret,
 * events are accepted but logged as unverified (set it before going live).
 */
import { NextResponse } from "next/server";
import { getSignWellConfig, verifySignWellEventHash } from "@/lib/esign/signwell";
import { applySignWellStatus } from "@/lib/esign/records";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "signwell-webhook" });
}

export async function POST(req: Request) {
  let payload: {
    event?: { type?: string; time?: number | string; hash?: string };
    data?: { object?: { id?: string; status?: string } };
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const cfg = getSignWellConfig();
  const event = payload.event || {};
  let verified = false;
  if (cfg.webhookSecret) {
    verified = verifySignWellEventHash(event, cfg.webhookSecret);
    if (!verified) {
      return NextResponse.json({ ok: false, error: "Invalid event hash" }, { status: 401 });
    }
  } else {
    console.warn("[esign/webhook] SIGNWELL_WEBHOOK_SECRET not set — accepting unverified event", event.type);
  }

  const type = String(event.type || "");
  const docId = String(payload.data?.object?.id || "");
  if (!type || !docId || !type.startsWith("document_")) {
    return NextResponse.json({ ok: true, ignored: true, type });
  }

  // Prefer the event type for terminal states; else the document's status.
  const terminal = ["document_completed", "document_canceled", "document_declined", "document_expired"];
  const statusSource = terminal.includes(type)
    ? type
    : String(payload.data?.object?.status || type);

  try {
    const updated = await applySignWellStatus(docId, statusSource);
    return NextResponse.json({ ok: true, verified, type, documentId: docId, updated });
  } catch (e) {
    console.error("[esign/webhook] update failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: "Update failed" }, { status: 500 });
  }
}
