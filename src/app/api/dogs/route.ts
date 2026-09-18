import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { saveUpload } from "@/lib/uploads";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const dogs = await prisma.dog.findMany({ orderBy: { callName: "asc" } });
  return NextResponse.json(dogs);
}

export async function POST(req: Request) {
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
  const dog = await prisma.dog.create({
    data: {
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
      photoPath,
    },
  });
  return NextResponse.json(dog);
}
