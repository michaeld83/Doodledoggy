import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const contracts = await prisma.contract.findMany({
    include: { customer: true, litter: true, reservation: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(contracts);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const customerId = String(body.customerId || "");
  if (!customerId) return NextResponse.json({ error: "customerId required" }, { status: 400 });

  const contract = await prisma.contract.create({
    data: {
      customerId,
      reservationId: body.reservationId || null,
      litterId: body.litterId || null,
      title: String(body.title || "Reservation contract").trim(),
      status: body.status || "DRAFT",
      depositAmount: Number(body.depositAmount || 0),
      feesJson: body.feesJson ? (typeof body.feesJson === "string" ? body.feesJson : JSON.stringify(body.feesJson)) : null,
      totalAmount: Number(body.totalAmount || 0),
      notes: body.notes || null,
      docusignEnvelopeId: body.docusignEnvelopeId || null,
      docusignStatus: body.docusignStatus || null,
      sentAt: body.sentAt ? new Date(body.sentAt) : null,
    },
  });
  return NextResponse.json(contract);
}
