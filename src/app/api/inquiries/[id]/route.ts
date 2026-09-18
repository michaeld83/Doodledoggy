import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isValidInquiryStatus } from "@/lib/inquiry";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const inquiry = await prisma.inquiry.findUnique({
    where: { id: params.id },
    include: { reservation: { select: { id: true, buyerName: true, status: true } } },
  });
  if (!inquiry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(inquiry);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.email !== undefined) data.email = String(body.email).trim().toLowerCase();
  if (body.phone !== undefined) data.phone = body.phone ? String(body.phone).trim() : null;
  if (body.message !== undefined) data.message = body.message ? String(body.message).trim() : null;
  if (body.source !== undefined) data.source = String(body.source).trim();
  if (body.status !== undefined) {
    const s = String(body.status).toUpperCase();
    if (!isValidInquiryStatus(s)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = s;
  }
  if (body.reservationId !== undefined) data.reservationId = body.reservationId || null;

  try {
    const inquiry = await prisma.inquiry.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json(inquiry);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await prisma.inquiry.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
