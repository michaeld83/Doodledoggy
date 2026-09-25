/**
 * Reservation "Send contract" — SignWell (active provider on this branch).
 * Legacy DocuSign equivalent: /api/docusign/send.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getEsignConnection, getEsignProviderId, canSendTemplate } from "@/lib/esign";
import { sendSignWellFromTemplate } from "@/lib/esign/signwell";
import { addOnsFromReservation, feesSnapshotJson, buildFeeLineItems } from "@/lib/fees";
import type { ContractTemplateKey } from "@/lib/esign/types";

const GOLDENDOODLE_BREEDS = new Set(["Mini Golden Doodle", "Micro Golden Doodle"]);
const BERNEDOODLE_BREEDS = new Set(["Mini Bernedoodle", "Micro Bernedoodle", "Munchkin Bernedoodle"]);

function templateKeyFor(breedType: string | null | undefined, explicit: string): ContractTemplateKey | null {
  const k = explicit.trim().toLowerCase();
  if (k === "goldendoodle" || k === "bernedoodle") return k;
  const b = (breedType || "").trim();
  if (GOLDENDOODLE_BREEDS.has(b)) return "goldendoodle";
  if (BERNEDOODLE_BREEDS.has(b)) return "bernedoodle";
  return null;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (getEsignProviderId() !== "signwell") {
    return NextResponse.json(
      { ok: false, status: "WRONG_PROVIDER", error: "ESIGN_PROVIDER is docusign — use /api/docusign/send." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
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

  const templateKey = templateKeyFor(reservation.litter.breedType, String(body.templateKey || ""));
  if (!templateKey) {
    return NextResponse.json(
      {
        ok: false,
        status: "TEMPLATE_ERROR",
        needsTemplateKey: true,
        error: "This litter has no breed type — pick a contract template (Goldendoodle or Bernedoodle).",
      },
      { status: 400 }
    );
  }

  const conn = getEsignConnection();
  const can = canSendTemplate(conn, templateKey);
  if (!can.ok) {
    return NextResponse.json({ ok: false, status: "NOT_CONNECTED", error: can.reason, missing: conn.missing }, { status: 503 });
  }

  const c = reservation.customer;
  const buyerName = c?.name || reservation.buyerName || "";
  const buyerEmail = c?.email || reservation.buyerEmail || "";
  if (!buyerEmail) return NextResponse.json({ error: "Buyer/customer email required" }, { status: 400 });
  if (!buyerName) return NextResponse.json({ error: "Buyer/customer name required" }, { status: 400 });

  const litterLabel =
    reservation.litter.name || `${reservation.litter.dam.callName} × ${reservation.litter.sire.callName}`;
  const familyLabel = templateKey === "goldendoodle" ? "Goldendoodle" : "Bernedoodle";
  const subject = `${familyLabel} Puppy Contract — ${buyerName}`;

  const result = await sendSignWellFromTemplate({
    templateKey,
    buyerName,
    buyerEmail,
    litter: litterLabel,
    puppy: reservation.puppy?.tempName || null,
    place: reservation.pickPosition != null ? String(reservation.pickPosition) : null,
    price: "TBD",
    depositMethod: reservation.paymentMethod || null,
    depositAmount: reservation.depositAmount,
    street: c?.street,
    city: c?.city,
    state: c?.state,
    zip: c?.zip,
    phone: c?.phone || reservation.buyerPhone,
    subject,
    documentName: `${subject} — ${litterLabel}`,
    metadata: { source: "reservation-send", reservationId, templateKey },
  });

  await prisma.reservation.update({
    where: { id: reservationId },
    data: { docusignEnvelopeId: result.documentId, docusignStatus: result.status },
  });

  let contract = reservation.contracts[0] || null;
  if (reservation.customerId) {
    const addOns = addOnsFromReservation(reservation);
    const lines = buildFeeLineItems(reservation.depositAmount, addOns);
    const data = {
      docusignEnvelopeId: result.documentId,
      docusignStatus: result.status,
      docusignTemplateKey: templateKey,
      docusignTemplateId: result.templateId,
      templateFieldsJson: JSON.stringify({ provider: "signwell", templateKey, place: reservation.pickPosition ?? null }),
      status: result.ok ? "SENT" : "DRAFT",
      sentAt: result.ok ? new Date() : null,
      feesJson: feesSnapshotJson(reservation.depositAmount, addOns),
      totalAmount: reservation.feesTotal ?? lines.reduce((s, l) => s + l.amount, 0),
      depositAmount: reservation.depositAmount,
      title: `Reservation — ${buyerName} — ${litterLabel}`,
    };
    contract = contract
      ? await prisma.contract.update({ where: { id: contract.id }, data })
      : await prisma.contract.create({
          data: { customerId: reservation.customerId, reservationId, litterId: reservation.litterId, ...data },
        });
  }

  return NextResponse.json({ ...result, contract }, { status: result.ok ? 200 : 502 });
}
