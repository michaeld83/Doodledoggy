import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { buildReservationEnvelope, sendEnvelope, getDocuSignConfig, isDocuSignConfigured, docusignSetupGuide } from "@/lib/docusign";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const reservationId = String(body.reservationId || "");
  if (!reservationId) return NextResponse.json({ error: "reservationId required" }, { status: 400 });

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { litter: { include: { dam: true, sire: true } }, puppy: true },
  });
  if (!reservation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!reservation.buyerEmail) {
    return NextResponse.json({ error: "Buyer email required for DocuSign" }, { status: 400 });
  }

  const litterLabel =
    reservation.litter.name || `${reservation.litter.dam.callName} × ${reservation.litter.sire.callName}`;

  const payload = buildReservationEnvelope({
    buyerName: reservation.buyerName,
    buyerEmail: reservation.buyerEmail,
    litterLabel,
    depositAmount: reservation.depositAmount,
    pickPosition: reservation.pickPosition,
    puppyName: reservation.puppy?.tempName,
  });

  const result = await sendEnvelope(payload);

  await prisma.reservation.update({
    where: { id: reservationId },
    data: {
      docusignEnvelopeId: result.envelopeId,
      docusignStatus: result.status,
    },
  });

  return NextResponse.json({
    ...result,
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
