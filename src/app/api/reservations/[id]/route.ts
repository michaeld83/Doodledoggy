import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const reservation = await prisma.reservation.update({
    where: { id: params.id },
    data: {
      buyerName: body.buyerName ?? undefined,
      buyerEmail: body.buyerEmail ?? undefined,
      buyerPhone: body.buyerPhone ?? undefined,
      depositAmount: body.depositAmount !== undefined ? Number(body.depositAmount) : undefined,
      paymentMethod: body.paymentMethod ?? undefined,
      paidWhere: body.paidWhere ?? undefined,
      pickPosition: body.pickPosition !== undefined ? (body.pickPosition != null ? Number(body.pickPosition) : null) : undefined,
      status: body.status ?? undefined,
      notes: body.notes ?? undefined,
      puppyId: body.puppyId !== undefined ? body.puppyId || null : undefined,
    },
  });
  return NextResponse.json(reservation);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.reservation.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
