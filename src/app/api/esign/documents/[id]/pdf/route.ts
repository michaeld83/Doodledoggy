import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { downloadSignWellCompletedPdf } from "@/lib/esign/signwell";

type Ctx = { params: { id: string } };

/** Download the completed (signed) PDF from SignWell, with audit page. */
export async function GET(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const r = await downloadSignWellCompletedPdf(params.id);
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: r.status });
  const safeId = params.id.replace(/[^a-zA-Z0-9-]/g, "");
  return new NextResponse(r.bytes, {
    status: 200,
    headers: {
      "Content-Type": r.contentType || "application/pdf",
      "Content-Disposition": `attachment; filename="contract-${safeId}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
