import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getEsignConnection } from "@/lib/esign";

/** Connection state (env only, names of missing vars — never values). */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(getEsignConnection());
}
