import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
    include: { customer: true, litter: { include: { dam: true, sire: true } }, reservation: true },
  });
  if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(contract);
}

export async function PUT(req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const contract = await prisma.contract.update({
    where: { id: params.id },
    data: {
      title: body.title ?? undefined,
      status: body.status ?? undefined,
      notes: body.notes ?? undefined,
      depositAmount: body.depositAmount !== undefined ? Number(body.depositAmount) : undefined,
      totalAmount: body.totalAmount !== undefined ? Number(body.totalAmount) : undefined,
      feesJson:
        body.feesJson !== undefined
          ? body.feesJson
            ? typeof body.feesJson === "string"
              ? body.feesJson
              : JSON.stringify(body.feesJson)
            : null
          : undefined,
      docusignEnvelopeId: body.docusignEnvelopeId ?? undefined,
      docusignStatus: body.docusignStatus ?? undefined,
    },
  });
  return NextResponse.json(contract);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.contract.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
