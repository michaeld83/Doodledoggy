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
  const litter = str(fieldsIn.litter);
  const puppy = str(fieldsIn.puppy);
  const price = str(fieldsIn.price) || "TBD";
  const place = str(fieldsIn.place);
  const depositMethod = str(fieldsIn.depositMethod);
  const depositAmountRaw = fieldsIn.depositAmount;
  let depositAmount = 0;
  if (depositAmountRaw !== null && depositAmountRaw !== undefined && depositAmountRaw !== "") {
    const n = Number(String(depositAmountRaw).replace(/[$,]/g, ""));
    if (Number.isFinite(n) && n >= 0) depositAmount = n;
  }

  // Address/phone: only from customer record (buyer fills at signing if missing)
  const street = customer.street || "";
  const city = customer.city || "";
  const state = customer.state || "";
  const zip = customer.zip || "";
  const phone = customer.phone || "";

  if (!buyerName) {
    return NextResponse.json({ error: "buyerName required" }, { status: 400 });
  }
  if (!buyerEmail) {
    return NextResponse.json({ error: "buyerEmail required" }, { status: 400 });
  }

  const addressFields: AddressFields = {
    buyerName,
    buyerEmail,
    litter: litter || null,
    puppy: puppy || null,
    price,
    place: place || null,
    depositMethod: depositMethod || null,
    depositAmount,
    // Only include address pieces that exist on the customer
    ...(street ? { street } : {}),
    ...(city ? { city } : {}),
    ...(state ? { state } : {}),
    ...(zip ? { zip } : {}),
    ...(phone ? { phone } : {}),
  };

  const templateFields = {
    buyerName,
    buyerEmail,
    litter: litter || null,
    puppy: puppy || null,
    price,
    place: place || null,
    depositMethod: depositMethod || null,
    depositAmount,
    street: street || null,
    city: city || null,
    state: state || null,
    zip: zip || null,
    phone: phone || null,
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
      litter,
      puppy,
      place,
      depositMethod,
      depositAmount: String(depositAmount),
    },
  };

  const result = await sendEnvelope(payload, {
    templateKey,
    templateId: template.templateId,
    addressFields,
    emailBlurb,
    prefillFields: {
      litter: litter || null,
      puppy: puppy || null,
      price,
      place: place || null,
      depositMethod: depositMethod || null,
      depositAmount,
    },
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
      depositAmount,
      totalAmount: 0,
      notes: null,
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
