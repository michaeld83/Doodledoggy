import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { saveUpload } from "@/lib/uploads";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const dog = await prisma.dog.findUnique({
    where: { id: params.id },
    include: { mother: true, father: true, healthRecords: { orderBy: { recordDate: "desc" } } },
  });
  if (!dog) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(dog);
}

export async function PUT(req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const photo = form.get("photo");
  let photoPath: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    const saved = await saveUpload(photo, "dogs");
    photoPath = saved.relativePath;
  }

  const dob = String(form.get("dateOfBirth") || "");
  const data: Record<string, unknown> = {
    registeredName: String(form.get("registeredName") || "").trim(),
    callName: String(form.get("callName") || "").trim(),
    sex: String(form.get("sex") || "FEMALE"),
    breed: String(form.get("breed") || "").trim(),
    dateOfBirth: dob ? new Date(dob) : null,
    status: String(form.get("status") || "ACTIVE"),
    microchip: String(form.get("microchip") || "") || null,
    registration: String(form.get("registration") || "") || null,
    notes: String(form.get("notes") || "") || null,
    motherId: String(form.get("motherId") || "") || null,
    fatherId: String(form.get("fatherId") || "") || null,
  };
  if (photoPath) data.photoPath = photoPath;

  const dog = await prisma.dog.update({ where: { id: params.id }, data });
  return NextResponse.json(dog);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.dog.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
