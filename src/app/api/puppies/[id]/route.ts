import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const puppy = await prisma.puppy.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      litter: { include: { dam: true, sire: true } },
      reservation: { include: { customer: true } },
    },
  });
  if (!puppy) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(puppy);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const puppy = await prisma.puppy.update({
    where: { id: params.id },
    data: {
      tempName:
        body.tempName !== undefined
          ? String(body.tempName || body.originalName || "").trim() || undefined
          : body.originalName !== undefined
            ? String(body.originalName || "").trim() || undefined
            : undefined,
      callName:
        body.callName !== undefined
          ? body.callName
            ? String(body.callName).trim()
            : null
          : undefined,
      sex: body.sex !== undefined ? body.sex || null : undefined,
      color: body.color !== undefined ? body.color || null : undefined,
      status: body.status ?? undefined,
      pickPosition:
        body.pickPosition !== undefined
          ? body.pickPosition != null && body.pickPosition !== ""
            ? Number(body.pickPosition)
            : null
          : undefined,
      customerId:
        body.customerId !== undefined ? body.customerId || null : undefined,
      wantsSnugglePuppy:
        body.wantsSnugglePuppy !== undefined
          ? Boolean(body.wantsSnugglePuppy)
          : undefined,
      wantsTravelDocuments:
        body.wantsTravelDocuments !== undefined
          ? Boolean(body.wantsTravelDocuments)
          : undefined,
      notes: body.notes !== undefined ? body.notes || null : undefined,
    },
    include: {
      customer: true,
      reservation: { include: { customer: true } },
    },
  });
  return NextResponse.json(puppy);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.puppy.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
