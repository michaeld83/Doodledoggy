import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { DocuSignButton } from "@/components/DocuSignButton";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReservationDetailPage({ params }: { params: { id: string } }) {
  const r = await prisma.reservation.findUnique({
    where: { id: params.id },
    include: {
      litter: { include: { dam: true, sire: true } },
      puppy: true,
    },
  });
  if (!r) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/reservations" className="text-sm text-[var(--gold-dark)] hover:underline">← Reservations</Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="page-title">{r.buyerName}</h1>
          <StatusBadge status={r.status} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-[var(--muted)]">Email</span><span>{r.buyerEmail || "—"}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Phone</span><span>{r.buyerPhone || "—"}</span></div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Litter</span>
            <Link href={`/litters/${r.litterId}`} className="hover:underline">
              {r.litter.name || `${r.litter.dam.callName} × ${r.litter.sire.callName}`}
            </Link>
          </div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Puppy</span><span>{r.puppy?.tempName || "—"}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Pick</span><span>{r.pickPosition ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Deposit</span><span>${r.depositAmount.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Payment</span><span>{r.paymentMethod || "—"}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Paid where</span><span>{r.paidWhere || "—"}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Created</span><span>{formatDate(r.createdAt)}</span></div>
          {r.notes && <p className="border-t pt-2" style={{ borderColor: "var(--border)" }}>{r.notes}</p>}
        </div>

        <div className="card space-y-3">
          <h2 className="font-serif text-lg text-[var(--brown)]">DocuSign</h2>
          <p className="text-sm text-[var(--muted)]">
            Builds a reservation agreement envelope payload. Mock mode never calls DocuSign.
            Live/sandbox with credentials returns CONFIGURED_PENDING — this stub does not fake successful live sends.
          </p>
          <dl className="text-sm space-y-1">
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Status</dt><dd>{r.docusignStatus || "Not sent"}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Envelope ID</dt><dd className="truncate max-w-[12rem]">{r.docusignEnvelopeId || "—"}</dd></div>
          </dl>
          <DocuSignButton reservationId={r.id} />
        </div>
      </div>
    </div>
  );
}
