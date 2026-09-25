/**
 * Customer page "Send contract" — SignWell (active provider on this branch).
 * Legacy DocuSign equivalent: /api/docusign/send-customer.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getEsignConnection, getEsignProviderId, canSendTemplate } from "@/lib/esign";
import { sendSignWellFromTemplate } from "@/lib/esign/signwell";
import { normalizePickNumber, parseAmount } from "@/lib/esign/fields";
import type { ContractTemplateKey } from "@/lib/esign/types";

function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (getEsignProviderId() !== "signwell") {
    return NextResponse.json(
      { ok: false, status: "WRONG_PROVIDER", error: "ESIGN_PROVIDER is docusign — use /api/docusign/send-customer." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const customerId = str(body.customerId);
  const templateKey = str(body.templateKey).toLowerCase();
  const reservationId = str(body.reservationId) || null;
  const fieldsIn = (body.fields && typeof body.fields === "object" ? body.fields : {}) as Record<string, unknown>;

  if (!customerId) return NextResponse.json({ error: "customerId required" }, { status: 400 });
  if (templateKey !== "goldendoodle" && templateKey !== "bernedoodle") {
    return NextResponse.json({ error: "templateKey required (goldendoodle | bernedoodle)" }, { status: 400 });
  }

  const conn = getEsignConnection();
  const can = canSendTemplate(conn, templateKey);
  if (!can.ok) {
    return NextResponse.json(
      { ok: false, status: "NOT_CONNECTED", error: can.reason, missing: conn.missing },
      { status: 503 }
    );
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    return NextResponse.json(
      {
        ok: false,
        status: "CUSTOMER_NOT_FOUND",
        error: "This customer record no longer exists (it was deleted). Nothing was sent.",
      },
      { status: 404 }
    );
  }

  let litterId: string | null = null;
  if (reservationId) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { customerId: true, litterId: true },
    });
    if (!reservation || reservation.customerId !== customerId) {
      return NextResponse.json({ error: "reservationId does not belong to this customer" }, { status: 400 });
    }
    litterId = reservation.litterId;
  }

  const buyerName = str(fieldsIn.buyerName) || customer.name;
  const buyerEmail = str(fieldsIn.buyerEmail) || customer.email || "";
  const litter = str(fieldsIn.litter);
  const puppy = str(fieldsIn.puppy);
  const price = str(fieldsIn.price) || "TBD";
  const depositMethod = str(fieldsIn.depositMethod);
  const depositAmount = parseAmount(fieldsIn.depositAmount);
  const placeRaw = str(fieldsIn.place);
  const place = normalizePickNumber(placeRaw);
  if (placeRaw && !place) {
    return NextResponse.json(
      { ok: false, status: "VALIDATION_ERROR", error: "Pick # (Place) must be a whole number, e.g. 3." },
      { status: 400 }
    );
  }
  if (!buyerName) return NextResponse.json({ error: "buyerName required" }, { status: 400 });
  if (!buyerEmail) return NextResponse.json({ error: "buyerEmail required" }, { status: 400 });

  const familyLabel = templateKey === "goldendoodle" ? "Goldendoodle" : "Bernedoodle";
  const subject = `${familyLabel} Puppy Contract — ${buyerName}`;

  const templateFields = {
    provider: "signwell",
    buyerName,
    buyerEmail,
    litter: litter || null,
    puppy: puppy || null,
    price,
    place: place || null,
    depositMethod: depositMethod || null,
    depositAmount,
    street: customer.street || null,
    city: customer.city || null,
    state: customer.state || null,
    zip: customer.zip || null,
    phone: customer.phone || null,
    templateKey,
  };

  const result = await sendSignWellFromTemplate({
    templateKey: templateKey as ContractTemplateKey,
    buyerName,
    buyerEmail,
    litter,
    puppy,
    place,
    price,
    depositMethod,
    depositAmount,
    street: customer.street,
    city: customer.city,
    state: customer.state,
    zip: customer.zip,
    phone: customer.phone,
    subject,
    documentName: subject,
    metadata: { source: "customer-send", customerId, templateKey, ...(reservationId ? { reservationId } : {}) },
  });

  await prisma.customer.update({ where: { id: customerId }, data: { docusignTemplateKey: templateKey } });

  const contract = await prisma.contract.create({
    data: {
      customerId,
      reservationId,
      litterId,
      title: `${familyLabel} contract — ${buyerName}`,
      status: result.ok ? "SENT" : "DRAFT",
      depositAmount,
      totalAmount: 0,
      notes: null,
      // Provider document id reuses the existing envelope column
      docusignEnvelopeId: result.documentId,
      docusignStatus: result.status,
      docusignTemplateKey: templateKey,
      docusignTemplateId: result.templateId,
      templateFieldsJson: JSON.stringify(templateFields),
      sentAt: result.ok ? new Date() : null,
    },
  });

  return NextResponse.json(
    { ...result, contract, templateKey, templateFields, connection: { provider: conn.provider, testMode: conn.testMode } },
    { status: result.ok ? 200 : 502 }
  );
}
