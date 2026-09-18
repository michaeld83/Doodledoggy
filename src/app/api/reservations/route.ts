import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { normalizeAddOns, reservationFeeFields, feesSnapshotJson } from "@/lib/fees";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const puppyId = body.puppyId || null;
  const depositAmount = Number(body.depositAmount || 0);
  const addOns = normalizeAddOns(body);
  const feeFields = reservationFeeFields(addOns, depositAmount);

  let customerId: string | null = body.customerId || null;
  const buyerName = String(body.buyerName || body.customerName || "").trim();
  const buyerEmail = body.buyerEmail || body.customerEmail || null;
  const buyerPhone = body.buyerPhone || body.customerPhone || null;

  // Create customer on the fly when requested
  if (!customerId && body.createCustomer && buyerName) {
    const customer = await prisma.customer.create({
      data: {
        name: buyerName,
        email: buyerEmail ? String(buyerEmail).trim() : null,
        phone: buyerPhone ? String(buyerPhone).trim() : null,
        address: body.customerAddress ? String(body.customerAddress).trim() : null,
        street: body.customerStreet ? String(body.customerStreet).trim() : null,
        city: body.customerCity ? String(body.customerCity).trim() : null,
        state: body.customerState ? String(body.customerState).trim() : null,
        zip: body.customerZip ? String(body.customerZip).trim() : null,
      },
    });
    customerId = customer.id;
  }

  if (customerId && !buyerName) {
    const existing = await prisma.customer.findUnique({ where: { id: customerId } });
    if (existing) {
      // denormalize for display
    }
  }

  let resolvedName = buyerName;
  let resolvedEmail = buyerEmail ? String(buyerEmail).trim() : null;
  let resolvedPhone = buyerPhone ? String(buyerPhone).trim() : null;
  if (customerId) {
    const c = await prisma.customer.findUnique({ where: { id: customerId } });
    if (c) {
      if (!resolvedName) resolvedName = c.name;
      if (!resolvedEmail) resolvedEmail = c.email;
      if (!resolvedPhone) resolvedPhone = c.phone;
    }
  }
  if (!resolvedName) {
    return NextResponse.json({ error: "Customer name required" }, { status: 400 });
  }

  const reservation = await prisma.reservation.create({
    data: {
      litterId: String(body.litterId),
      puppyId,
      customerId,
      buyerName: resolvedName,
      buyerEmail: resolvedEmail,
      buyerPhone: resolvedPhone,
      depositAmount,
      paymentMethod: body.paymentMethod || null,
      paidWhere: body.paidWhere || null,
      paid: Boolean(body.paid),
      pickPosition: body.pickPosition != null && body.pickPosition !== "" ? Number(body.pickPosition) : null,
      notes: body.notes || null,
      status: "OPEN",
      ...feeFields,
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

  // Optionally create a Contract draft linked to customer
  let contract = null;
  if (customerId && body.createContract !== false) {
    contract = await prisma.contract.create({
      data: {
        customerId,
        reservationId: reservation.id,
        litterId: reservation.litterId,
        title: body.contractTitle || `Reservation — ${resolvedName}`,
        status: "DRAFT",
        depositAmount,
        feesJson: feesSnapshotJson(depositAmount, addOns),
        totalAmount: feeFields.feesTotal ?? depositAmount,
        notes: body.notes || null,
      },
    });
  }

  return NextResponse.json({ ...reservation, contract });
}
