import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const puppy = await prisma.puppy.create({
    data: {
      litterId: String(body.litterId),
      tempName: String(body.tempName || "Pup").trim(),
      sex: body.sex || null,
      color: body.color || null,
      status: body.status || "AVAILABLE",
      pickPosition: body.pickPosition != null ? Number(body.pickPosition) : null,
      notes: body.notes || null,
    },
  });
  return NextResponse.json(puppy);
}
