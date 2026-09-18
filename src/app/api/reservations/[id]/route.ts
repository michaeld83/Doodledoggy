import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { normalizeAddOns, reservationFeeFields, feesSnapshotJson } from "@/lib/fees";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  const depositAmount =
    body.depositAmount !== undefined ? Number(body.depositAmount) : undefined;
  const hasFeePayload =
    body.snugglePuppy !== undefined ||
    body.travelBag !== undefined ||
    body.travelArrangements !== undefined ||
    body.customFees !== undefined ||
    body.customFeesJson !== undefined;

  let feeFields = {};
  if (hasFeePayload || depositAmount !== undefined) {
    const existing = await prisma.reservation.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const addOns = normalizeAddOns({
      snugglePuppy: body.snugglePuppy ?? existing.snugglePuppy,
      snugglePuppyAmount: body.snugglePuppyAmount ?? existing.snugglePuppyAmount,
      travelBag: body.travelBag ?? existing.travelBag,
      travelBagAmount: body.travelBagAmount ?? existing.travelBagAmount,
      travelArrangements: body.travelArrangements ?? existing.travelArrangements,
      travelArrangementsNotes: body.travelArrangementsNotes ?? existing.travelArrangementsNotes,
      travelArrangementsAmount: body.travelArrangementsAmount ?? existing.travelArrangementsAmount,
      customFees: body.customFees ?? body.customFeesJson ?? existing.customFeesJson,
    });
    const dep = depositAmount ?? existing.depositAmount;
    feeFields = reservationFeeFields(addOns, dep);

    // Keep linked draft contract fees in sync
    await prisma.contract.updateMany({
      where: { reservationId: params.id, status: "DRAFT" },
      data: {
        depositAmount: dep,
        feesJson: feesSnapshotJson(dep, addOns),
        totalAmount: (feeFields as { feesTotal: number }).feesTotal,
      },
    });
  }

  const reservation = await prisma.reservation.update({
    where: { id: params.id },
    data: {
      customerId: body.customerId !== undefined ? body.customerId || null : undefined,
      buyerName: body.buyerName ?? undefined,
      buyerEmail: body.buyerEmail !== undefined ? body.buyerEmail || null : undefined,
      buyerPhone: body.buyerPhone !== undefined ? body.buyerPhone || null : undefined,
      depositAmount,
      paymentMethod: body.paymentMethod ?? undefined,
      paidWhere: body.paidWhere !== undefined ? body.paidWhere || null : undefined,
      paid: body.paid !== undefined ? Boolean(body.paid) : undefined,
      pickPosition:
        body.pickPosition !== undefined
          ? body.pickPosition != null && body.pickPosition !== ""
            ? Number(body.pickPosition)
            : null
          : undefined,
      status: body.status ?? undefined,
      notes: body.notes !== undefined ? body.notes || null : undefined,
      puppyId: body.puppyId !== undefined ? body.puppyId || null : undefined,
      litterId: body.litterId ?? undefined,
      ...feeFields,
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
