import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const puppy = await prisma.puppy.update({
    where: { id: params.id },
    data: {
      tempName: body.tempName ?? undefined,
      sex: body.sex ?? undefined,
      color: body.color ?? undefined,
      status: body.status ?? undefined,
      pickPosition: body.pickPosition !== undefined ? (body.pickPosition != null ? Number(body.pickPosition) : null) : undefined,
      notes: body.notes ?? undefined,
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
