import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      reservations: { include: { litter: true }, orderBy: { createdAt: "desc" } },
      contracts: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(customer);
}

export async function PUT(req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const customer = await prisma.customer.update({
    where: { id: params.id },
    data: {
      name: body.name !== undefined ? String(body.name).trim() : undefined,
      email: body.email !== undefined ? (body.email ? String(body.email).trim() : null) : undefined,
      phone: body.phone !== undefined ? (body.phone ? String(body.phone).trim() : null) : undefined,
      address: body.address !== undefined ? (body.address ? String(body.address).trim() : null) : undefined,
      street: body.street !== undefined ? (body.street ? String(body.street).trim() : null) : undefined,
      city: body.city !== undefined ? (body.city ? String(body.city).trim() : null) : undefined,
      state: body.state !== undefined ? (body.state ? String(body.state).trim() : null) : undefined,
      zip: body.zip !== undefined ? (body.zip ? String(body.zip).trim() : null) : undefined,
      notes: body.notes !== undefined ? (body.notes ? String(body.notes).trim() : null) : undefined,
      docusignTemplateKey:
        body.docusignTemplateKey !== undefined
          ? body.docusignTemplateKey
            ? String(body.docusignTemplateKey).trim().toLowerCase()
            : null
          : undefined,
    },
  });
  return NextResponse.json(customer);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const existing = await prisma.customer.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.customer.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Could not delete client: ${message.slice(0, 200)}` },
      { status: 400 }
    );
  }
}
