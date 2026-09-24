import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { DocuSignButton } from "@/components/DocuSignButton";
import { formatDate, formatMoney } from "@/lib/utils";
import { addOnsFromReservation, buildFeeLineItems } from "@/lib/fees";

export const dynamic = "force-dynamic";

export default async function ReservationDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { ds?: string; dsOk?: string };
}) {
  const dsMsg = typeof searchParams?.ds === "string" ? searchParams.ds.slice(0, 600) : "";
  const dsOk = searchParams?.dsOk === "1";
  const r = await prisma.reservation.findUnique({
    where: { id: params.id },
    include: {
      litter: { include: { dam: true, sire: true } },
      puppy: true,
      customer: true,
      contracts: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!r) notFound();

  const displayName = r.customer?.name || r.buyerName || "Reservation";
  const lines = buildFeeLineItems(r.depositAmount, addOnsFromReservation(r));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/reservations" className="text-sm text-[var(--gold-dark)] hover:underline">
            ← Reservations
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="page-title">{displayName}</h1>
            <StatusBadge status={r.status} />
            {r.paid && <span className="badge-success">Paid</span>}
          </div>
        </div>
        <Link href={`/reservations/${r.id}/edit`} className="btn-secondary">
          Edit
        </Link>
      </div>

      {dsMsg && (
        <div
          className={`card text-sm whitespace-pre-wrap ${dsOk ? "text-[var(--brown-soft)]" : "border border-red-300 text-red-700"}`}
        >
          <strong>{dsOk ? "DocuSign: " : "DocuSign send failed: "}</strong>
          {dsMsg}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-2 text-sm">
          {r.customer && (
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Customer</span>
              <Link href={`/customers/${r.customer.id}`} className="hover:underline">
                {r.customer.name}
              </Link>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Email</span>
            <span>{r.customer?.email || r.buyerEmail || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Phone</span>
            <span>{r.customer?.phone || r.buyerPhone || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Litter</span>
            <Link href={`/litters/${r.litterId}`} className="hover:underline">
              {r.litter.name || `${r.litter.dam.callName} × ${r.litter.sire.callName}`}
            </Link>
          </div>
          {r.litter.breedType && (
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Breed type</span>
              <span>{r.litter.breedType}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Puppy</span>
            <span>{r.puppy?.tempName || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Pick</span>
            <span>{r.pickPosition ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Payment</span>
            <span>
              {r.paymentMethod || "—"}
              {r.paidWhere ? ` @ ${r.paidWhere}` : ""}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Created</span>
            <span>{formatDate(r.createdAt)}</span>
          </div>
          {r.notes && (
            <p className="border-t pt-2" style={{ borderColor: "var(--border)" }}>
              {r.notes}
            </p>
          )}
        </div>

        <div className="card space-y-3">
          <h2 className="font-serif text-lg text-[var(--brown)]">Fee breakdown</h2>
          <ul className="space-y-1 text-sm">
            {lines.map((l) => (
              <li key={l.key} className="flex justify-between gap-2">
                <span>
                  {l.label}
                  {l.notes ? <span className="text-[var(--muted)]"> — {l.notes}</span> : null}
                </span>
                <span>{formatMoney(l.amount)}</span>
              </li>
            ))}
          </ul>
          <div
            className="flex justify-between border-t pt-2 font-semibold"
            style={{ borderColor: "var(--border)" }}
          >
            <span>Total</span>
            <span>{formatMoney(r.feesTotal ?? lines.reduce((s, l) => s + l.amount, 0))}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-3">
          <h2 className="font-serif text-lg text-[var(--brown)]">DocuSign</h2>
          <p className="text-sm text-[var(--muted)]">
            Builds a reservation agreement with all fee lines. Mock mode never calls DocuSign.
            Sandbox/live with credentials sends a real DocuSign envelope; mock mode does not call the API. Never fakes
            successful live sends.
          </p>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">Status</dt>
              <dd>{r.docusignStatus || "Not sent"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">Envelope ID</dt>
              <dd className="max-w-[12rem] truncate">{r.docusignEnvelopeId || "—"}</dd>
            </div>
          </dl>
          <DocuSignButton reservationId={r.id} hasBreedType={Boolean(r.litter.breedType)} />
        </div>

        <div className="card space-y-3">
          <h2 className="font-serif text-lg text-[var(--brown)]">Contracts</h2>
          {r.contracts.length === 0 && (
            <p className="text-sm text-[var(--muted)]">
              No contract yet — Save + DocuSign from the form creates one when a customer is linked.
            </p>
          )}
          <ul className="space-y-2 text-sm">
            {r.contracts.map((c) => (
              <li key={c.id}>
                <Link href={`/contracts/${c.id}`} className="font-medium hover:underline">
                  {c.title}
                </Link>
                <div className="text-xs text-[var(--muted)]">
                  {c.status} · {formatMoney(c.totalAmount)}
                  {c.docusignStatus ? ` · ${c.docusignStatus}` : ""}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
