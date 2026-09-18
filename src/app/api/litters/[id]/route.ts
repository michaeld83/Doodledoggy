import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Ctx = { params: { id: string } };

export async function PUT(req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const litter = await prisma.litter.update({
    where: { id: params.id },
    data: {
      name: body.name ?? undefined,
      notes: body.notes ?? undefined,
      status: body.status ?? undefined,
      breedType: body.breedType !== undefined ? (body.breedType || null) : undefined,
      whelpDate: body.whelpDate !== undefined ? (body.whelpDate ? new Date(body.whelpDate) : null) : undefined,
      expectedDate:
        body.expectedDate !== undefined ? (body.expectedDate ? new Date(body.expectedDate) : null) : undefined,
    },
  });
  return NextResponse.json(litter);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.litter.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
