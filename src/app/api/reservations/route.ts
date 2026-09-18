import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const puppyId = body.puppyId || null;

  const reservation = await prisma.reservation.create({
    data: {
      litterId: String(body.litterId),
      puppyId,
      buyerName: String(body.buyerName || "").trim(),
      buyerEmail: body.buyerEmail || null,
      buyerPhone: body.buyerPhone || null,
      depositAmount: Number(body.depositAmount || 0),
      paymentMethod: body.paymentMethod || null,
      paidWhere: body.paidWhere || null,
      pickPosition: body.pickPosition != null ? Number(body.pickPosition) : null,
      notes: body.notes || null,
      status: "OPEN",
    },
  });

  if (puppyId) {
    await prisma.puppy.update({
      where: { id: puppyId },
      data: {
        status: "RESERVED",
        pickPosition: reservation.pickPosition ?? undefined,
      },
    });
  }

  return NextResponse.json(reservation);
}
