import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  sendEnvelope,
  resolveTemplateByKey,
  getDocuSignConfig,
  isDocuSignConfigured,
  docusignSetupGuide,
  type EnvelopePayload,
} from "@/lib/docusign";
import {
  buildAddressEmailBlurb,
  type AddressFields,
} from "@/lib/docusign-template-tabs";

function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const customerId = str(body.customerId);
  const templateKey = str(body.templateKey).toLowerCase();
  const reservationId = str(body.reservationId) || null;
  const fieldsIn = (
    body.fields && typeof body.fields === "object" ? body.fields : {}
  ) as Record<string, unknown>;

  if (!customerId) {
    return NextResponse.json({ error: "customerId required" }, { status: 400 });
  }
  if (!templateKey) {
    return NextResponse.json(
      { error: "templateKey required (goldendoodle | bernedoodle)" },
      { status: 400 }
    );
  }

  const template = resolveTemplateByKey(templateKey);
  if (!template.ok) {
    return NextResponse.json(
      { ok: false, error: template.error, status: "TEMPLATE_ERROR" },
      { status: 400 }
    );
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  let litterId: string | null = null;
  if (reservationId) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { id: true, customerId: true, litterId: true },
    });
    if (!reservation || reservation.customerId !== customerId) {
      return NextResponse.json(
        { error: "reservationId does not belong to this customer" },
        { status: 400 }
      );
    }
    litterId = reservation.litterId;
  }

  const buyerName = str(fieldsIn.buyerName) || customer.name;
  const buyerEmail = str(fieldsIn.buyerEmail) || customer.email || "";
  const street = str(fieldsIn.street) || customer.street || "";
  const city = str(fieldsIn.city) || customer.city || "";
  const state = str(fieldsIn.state) || customer.state || "";
  const zip = str(fieldsIn.zip) || customer.zip || "";
  const phone = str(fieldsIn.phone) || customer.phone || "";
  // Free-text puppy price — typically TBD until looks determine amount
  const price = str(fieldsIn.price) || "TBD";
  const notes = str(fieldsIn.notes) || "";

  if (!buyerName) {
    return NextResponse.json({ error: "buyerName required" }, { status: 400 });
  }
  if (!buyerEmail) {
    return NextResponse.json({ error: "buyerEmail required" }, { status: 400 });
  }

  const addressFields: AddressFields = {
    buyerName,
    buyerEmail,
    street,
    city,
    state,
    zip,
    phone,
    price,
    notes: notes || null,
  };

  const templateFields = {
    buyerName,
    buyerEmail,
    street,
    city,
    state,
    zip,
    phone,
    price,
    notes: notes || null,
    templateKey,
  };

  const emailBlurb = buildAddressEmailBlurb(addressFields);
  const familyLabel =
    template.breedFamily === "goldendoodle" ? "Goldendoodle" : "Bernedoodle";

  const payload: EnvelopePayload = {
    emailSubject: `${familyLabel} Puppy Contract — ${buyerName}`,
    recipients: {
      signers: [
        {
          email: buyerEmail,
          name: buyerName,
          recipientId: "1",
          routingOrder: "1",
        },
      ],
    },
    documents: [],
    status: "created",
    metadata: {
      source: "customer-send",
      customerId,
      templateKey,
      templateId: template.templateId,
      price,
    },
  };

  const result = await sendEnvelope(payload, {
    templateKey,
    templateId: template.templateId,
    addressFields,
    emailBlurb,
  });

  await prisma.customer.update({
    where: { id: customerId },
    data: { docusignTemplateKey: templateKey },
  });

  const contract = await prisma.contract.create({
    data: {
      customerId,
      reservationId,
      litterId,
      title: `${familyLabel} contract — ${buyerName}`,
      status: result.ok ? "SENT" : "DRAFT",
      depositAmount: 0,
      totalAmount: 0,
      notes: notes || null,
      docusignEnvelopeId: result.envelopeId,
      docusignStatus: result.status,
      docusignTemplateKey: templateKey,
      docusignTemplateId: result.templateId || template.templateId,
      templateFieldsJson: JSON.stringify(templateFields),
      sentAt: result.ok ? new Date() : null,
    },
  });

  return NextResponse.json({
    ...result,
    contract,
    templateKey,
    templateFields,
    config: {
      mode: getDocuSignConfig().mode,
      configured: isDocuSignConfigured(),
      setupGuide: docusignSetupGuide(),
    },
  });
}
