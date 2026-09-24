import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PAYMENT_METHODS } from "@/lib/utils";

function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customerId = str(req.nextUrl.searchParams.get("customerId"));
  const where = customerId ? { customerId } : {};

  const payments = await prisma.payment.findMany({
    where,
    include: {
      contract: { select: { id: true, title: true } },
      reservation: { select: { id: true } },
    },
    orderBy: { paidAt: "desc" },
  });

  return NextResponse.json({ payments });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const customerId = str(body.customerId);
  const amount = Number(body.amount);
  const methodRaw = str(body.method).toUpperCase();
  const method =
    methodRaw && (PAYMENT_METHODS as readonly string[]).includes(methodRaw)
      ? methodRaw
      : methodRaw || null;
  const paidWhere = str(body.paidWhere) || null;
  const notes = str(body.notes) || null;
  const contractId = str(body.contractId) || null;
  const reservationId = str(body.reservationId) || null;

  if (!customerId) {
    return NextResponse.json({ error: "customerId required" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  if (contractId) {
    const contract = await prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract || contract.customerId !== customerId) {
      return NextResponse.json(
        { error: "contractId does not belong to this customer" },
        { status: 400 }
      );
    }
  }

  if (reservationId) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!reservation || reservation.customerId !== customerId) {
      return NextResponse.json(
        { error: "reservationId does not belong to this customer" },
        { status: 400 }
      );
    }
  }

  let paidAt = new Date();
  if (body.paidAt) {
    const parsed = new Date(String(body.paidAt));
    if (!Number.isNaN(parsed.getTime())) paidAt = parsed;
  }

  const payment = await prisma.payment.create({
    data: {
      customerId,
      amount,
      method,
      paidWhere,
      paidAt,
      notes,
      contractId,
      reservationId,
    },
    include: {
      contract: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json({ ok: true, payment });
}
