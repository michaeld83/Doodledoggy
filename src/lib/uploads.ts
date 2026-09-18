import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export function uploadRoot() {
  return path.resolve(process.env.UPLOAD_DIR || "./public/uploads");
}

export async function saveUpload(file: File, subdir: string): Promise<{ relativePath: string; fileName: string }> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || "";
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const fileName = `${Date.now()}-${randomUUID().slice(0, 8)}-${safe || "file"}${ext && !safe.endsWith(ext) ? ext : ""}`;
  const dir = path.join(uploadRoot(), subdir);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), bytes);
  const relativePath = `/uploads/${subdir}/${fileName}`;
  return { relativePath, fileName: file.name };
}
