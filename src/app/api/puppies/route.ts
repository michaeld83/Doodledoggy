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
      tempName: String(body.tempName || body.originalName || "Pup").trim(),
      callName: body.callName ? String(body.callName).trim() : null,
      sex: body.sex || null,
      color: body.color || null,
      status: body.status || "AVAILABLE",
      pickPosition: body.pickPosition != null && body.pickPosition !== "" ? Number(body.pickPosition) : null,
      customerId: body.customerId || null,
      wantsSnugglePuppy: Boolean(body.wantsSnugglePuppy),
      wantsTravelDocuments: Boolean(body.wantsTravelDocuments),
      notes: body.notes || null,
    },
  });
  return NextResponse.json(puppy);
}
