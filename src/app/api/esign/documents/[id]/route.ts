import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSignWellDocument } from "@/lib/esign/signwell";
import { applySignWellStatus } from "@/lib/esign/records";

type Ctx = { params: { id: string } };

/** Refresh status from SignWell and store it on matching contracts/reservations. */
export async function GET(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const doc = await getSignWellDocument(params.id);
  if (!doc.ok) {
    return NextResponse.json(
      { ok: false, status: doc.status, error: doc.error },
      { status: doc.status === "NOT_CONNECTED" ? 503 : 502 }
    );
  }
  const updated = await applySignWellStatus(params.id, doc.status);
  return NextResponse.json({ ok: true, documentId: params.id, status: doc.status, completedAt: doc.completedAt, updated });
}
