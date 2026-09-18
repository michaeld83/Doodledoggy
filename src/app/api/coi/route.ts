import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { computeCoiBetween, dogsToMap } from "@/lib/coi";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const damId = String(body.damId || "");
  const sireId = String(body.sireId || "");
  const generations = Number(body.generations || process.env.COI_COMMON_ANCESTOR_GENS || 5);
  if (!damId || !sireId) {
    return NextResponse.json({ error: "damId and sireId required" }, { status: 400 });
  }

  const dogs = await prisma.dog.findMany({
    select: {
      id: true,
      callName: true,
      registeredName: true,
      sex: true,
      motherId: true,
      fatherId: true,
    },
  });
  const map = dogsToMap(dogs);
  const result = computeCoiBetween(damId, sireId, map, generations);

  const check = await prisma.matingCoiCheck.create({
    data: {
      damId,
      sireId,
      coiPercent: result.coiPercent,
      generations,
      commonAncestors: JSON.stringify(result.commonAncestors),
      highRelatedness: result.highRelatedness,
      confirmed: false,
      warningMessage: result.warningMessage,
      litterId: body.litterId || null,
    },
  });

  return NextResponse.json({ ...result, checkId: check.id });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const checkId = String(body.checkId || "");
  if (!checkId) return NextResponse.json({ error: "checkId required" }, { status: 400 });
  if (body.confirmed !== true) {
    return NextResponse.json({ error: "Confirmation required for high relatedness matings" }, { status: 400 });
  }
  const check = await prisma.matingCoiCheck.update({
    where: { id: checkId },
    data: {
      confirmed: true,
      confirmedBy: session.email,
      confirmedAt: new Date(),
    },
  });
  return NextResponse.json(check);
}
