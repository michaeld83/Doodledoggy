import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { INQUIRY_SOURCES, isValidInquiryStatus } from "@/lib/inquiry";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const source = searchParams.get("source");

  const where: { status?: string; source?: string } = {};
  if (status && status !== "all") where.status = status.toUpperCase();
  if (source && source !== "all") where.source = source;

  const inquiries = await prisma.inquiry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { reservation: { select: { id: true, buyerName: true } } },
  });
  return NextResponse.json(inquiries);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  if (!name || !email) {
    return NextResponse.json({ error: "name and email are required" }, { status: 400 });
  }

  const sourceRaw = String(body.source || "manual").trim().toLowerCase();
  const source = (INQUIRY_SOURCES as readonly string[]).includes(sourceRaw) ? sourceRaw : "manual";
  const statusRaw = String(body.status || "NEW").toUpperCase();
  const status = isValidInquiryStatus(statusRaw) ? statusRaw : "NEW";

  const inquiry = await prisma.inquiry.create({
    data: {
      name,
      email,
      phone: body.phone != null && String(body.phone).trim() ? String(body.phone).trim() : null,
      message: body.message != null && String(body.message).trim() ? String(body.message).trim() : null,
      source,
      status,
      externalId: body.externalId != null && String(body.externalId).trim() ? String(body.externalId).trim() : null,
      rawPayload: body.rawPayload != null ? String(body.rawPayload) : null,
      reservationId: body.reservationId || null,
    },
  });
  return NextResponse.json(inquiry, { status: 201 });
}
