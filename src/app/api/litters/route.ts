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
  if (!damId || !sireId) {
    return NextResponse.json({ error: "Dam and sire required" }, { status: 400 });
  }

  const dogs = await prisma.dog.findMany({
    select: { id: true, callName: true, registeredName: true, sex: true, motherId: true, fatherId: true },
  });
  const result = computeCoiBetween(damId, sireId, dogsToMap(dogs), Number(process.env.COI_COMMON_ANCESTOR_GENS || 5));

  if (result.highRelatedness && body.confirmed !== true) {
    return NextResponse.json(
      {
        error: "HIGH_RELATEDNESS",
        message: result.warningMessage || "High relatedness — confirmation required",
        coi: result,
      },
      { status: 409 }
    );
  }

  const litter = await prisma.litter.create({
    data: {
      name: body.name || null,
      damId,
      sireId,
      whelpDate: body.whelpDate ? new Date(body.whelpDate) : null,
      expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
      notes: body.notes || null,
      status: body.status || "PLANNED",
    },
  });

  await prisma.matingCoiCheck.create({
    data: {
      litterId: litter.id,
      damId,
      sireId,
      coiPercent: result.coiPercent,
      generations: Number(process.env.COI_COMMON_ANCESTOR_GENS || 5),
      commonAncestors: JSON.stringify(result.commonAncestors),
      highRelatedness: result.highRelatedness,
      confirmed: result.highRelatedness ? true : false,
      confirmedBy: result.highRelatedness ? session.email : null,
      confirmedAt: result.highRelatedness ? new Date() : null,
      warningMessage: result.warningMessage,
    },
  });

  return NextResponse.json(litter);
}
