import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { mapWebhookBodyToInquiry, type WebhookInquiryBody } from "@/lib/inquiry";

function secretsMatch(provided: string | null, expected: string): boolean {
  if (!provided || !expected) return false;
  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Public ingest endpoint for future GoDaddy / website form webhooks.
 * Auth: header X-Webhook-Secret must match env INQUIRY_WEBHOOK_SECRET.
 * Does not use session cookies — intended for external form posts.
 */
export async function POST(req: Request) {
  const expected = process.env.INQUIRY_WEBHOOK_SECRET || "";
  if (!expected) {
    return NextResponse.json(
      { error: "Webhook not configured (set INQUIRY_WEBHOOK_SECRET)" },
      { status: 503 }
    );
  }

  const provided = req.headers.get("x-webhook-secret");
  if (!secretsMatch(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: WebhookInquiryBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fields = mapWebhookBodyToInquiry(body);
  if (!body.name || !body.email) {
    return NextResponse.json({ error: "name and email are required" }, { status: 400 });
  }

  if (fields.externalId) {
    const existing = await prisma.inquiry.findUnique({ where: { externalId: fields.externalId } });
    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }
  }

  try {
    const inquiry = await prisma.inquiry.create({
      data: {
        name: fields.name,
        email: fields.email,
        phone: fields.phone,
        message: fields.message,
        source: fields.source,
        status: fields.status,
        externalId: fields.externalId,
        rawPayload: fields.rawPayload,
      },
    });
    return NextResponse.json(inquiry, { status: 201 });
  } catch (e: unknown) {
    // Race on unique externalId
    if (fields.externalId) {
      const existing = await prisma.inquiry.findUnique({ where: { externalId: fields.externalId } });
      if (existing) return NextResponse.json(existing, { status: 200 });
    }
    const message = e instanceof Error ? e.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
