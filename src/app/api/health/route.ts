import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { saveUpload } from "@/lib/uploads";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const dogId = String(form.get("dogId") || "");
  if (!dogId) return NextResponse.json({ error: "dogId required" }, { status: 400 });

  const file = form.get("file");
  let filePath: string | undefined;
  let fileName: string | undefined;
  if (file instanceof File && file.size > 0) {
    const saved = await saveUpload(file, "health");
    filePath = saved.relativePath;
    fileName = saved.fileName;
  }

  const recordDate = String(form.get("recordDate") || "");
  const followUpAt = String(form.get("followUpAt") || "");

  const record = await prisma.healthRecord.create({
    data: {
      dogId,
      title: String(form.get("title") || "").trim() || "Health note",
      notes: String(form.get("notes") || "") || null,
      recordDate: recordDate ? new Date(recordDate) : new Date(),
      followUpAt: followUpAt ? new Date(followUpAt) : null,
      filePath,
      fileName,
    },
  });
  return NextResponse.json(record);
}
