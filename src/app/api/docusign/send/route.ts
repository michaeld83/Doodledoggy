import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  buildReservationEnvelope,
  sendEnvelope,
  getDocuSignConfig,
  isDocuSignConfigured,
  docusignSetupGuide,
} from "@/lib/docusign";
import { addOnsFromReservation, feesSnapshotJson } from "@/lib/fees";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const reservationId = String(body.reservationId || "");
  if (!reservationId) return NextResponse.json({ error: "reservationId required" }, { status: 400 });

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      litter: { include: { dam: true, sire: true } },
      puppy: true,
      customer: true,
      contracts: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!reservation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const buyerName = reservation.customer?.name || reservation.buyerName || "";
  const buyerEmail = reservation.customer?.email || reservation.buyerEmail || "";
  const buyerPhone = reservation.customer?.phone || reservation.buyerPhone || null;

  if (!buyerEmail) {
    return NextResponse.json({ error: "Buyer/customer email required for DocuSign" }, { status: 400 });
  }
  if (!buyerName) {
    return NextResponse.json({ error: "Buyer/customer name required for DocuSign" }, { status: 400 });
  }

  const litterLabel =
    reservation.litter.name || `${reservation.litter.dam.callName} × ${reservation.litter.sire.callName}`;
  const addOns = addOnsFromReservation(reservation);

  const payload = buildReservationEnvelope({
    buyerName,
    buyerEmail,
    buyerPhone,
    litterLabel,
    breedType: reservation.litter.breedType,
    depositAmount: reservation.depositAmount,
    pickPosition: reservation.pickPosition,
    puppyName: reservation.puppy?.tempName,
    paymentMethod: reservation.paymentMethod,
    paidWhere: reservation.paidWhere,
    paid: reservation.paid,
    addOns,
  });

  const result = await sendEnvelope(payload);

  await prisma.reservation.update({
    where: { id: reservationId },
    data: {
      docusignEnvelopeId: result.envelopeId,
      docusignStatus: result.status,
    },
  });

  // Ensure a Contract exists for this customer and update DocuSign fields
  let contract = reservation.contracts[0] || null;
  const customerId = reservation.customerId;
  if (customerId) {
    const contractData = {
      docusignEnvelopeId: result.envelopeId,
      docusignStatus: result.status,
      status: result.ok ? "SENT" : "DRAFT",
      sentAt: result.ok ? new Date() : null,
      feesJson: feesSnapshotJson(reservation.depositAmount, addOns),
      totalAmount: payload.fees?.total ?? reservation.feesTotal ?? reservation.depositAmount,
      depositAmount: reservation.depositAmount,
      title: `Reservation — ${buyerName} — ${litterLabel}`,
    };
    if (contract) {
      contract = await prisma.contract.update({
        where: { id: contract.id },
        data: contractData,
      });
    } else {
      contract = await prisma.contract.create({
        data: {
          customerId,
          reservationId,
          litterId: reservation.litterId,
          ...contractData,
        },
      });
    }
  }

  return NextResponse.json({
    ...result,
    contract,
    config: {
      mode: getDocuSignConfig().mode,
      configured: isDocuSignConfigured(),
      setupGuide: docusignSetupGuide(),
    },
  });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const cfg = getDocuSignConfig();
  return NextResponse.json({
    mode: cfg.mode,
    configured: isDocuSignConfigured(cfg),
    authServer: cfg.authServer,
    hasIntegrationKey: Boolean(cfg.integrationKey),
    hasUserId: Boolean(cfg.userId),
    hasAccountId: Boolean(cfg.accountId),
    hasPrivateKeyPath: Boolean(cfg.privateKeyPath),
    setupGuide: docusignSetupGuide(),
  });
}
