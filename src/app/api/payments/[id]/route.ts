import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = String(params.id || "").trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await prisma.payment.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  await prisma.payment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
