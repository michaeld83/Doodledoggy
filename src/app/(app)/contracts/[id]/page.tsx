import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { DocuSignButton } from "@/components/DocuSignButton";
import { formatDate, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ContractDetailPage({ params }: { params: { id: string } }) {
  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      litter: { include: { dam: true, sire: true } },
      reservation: true,
    },
  });
  if (!contract) notFound();

  let feeLines: { label: string; amount: number; notes?: string | null }[] = [];
  try {
    if (contract.feesJson) {
      const parsed = JSON.parse(contract.feesJson);
      feeLines = parsed.lines || [];
    }
  } catch {
    feeLines = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/contracts" className="text-sm text-[var(--gold-dark)] hover:underline">
          ← Contracts
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="page-title">{contract.title}</h1>
          <StatusBadge status={contract.status} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Customer</span>
            <Link href={`/customers/${contract.customerId}`} className="hover:underline">
              {contract.customer.name}
            </Link>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Email</span>
            <span>{contract.customer.email || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Litter</span>
            <span>
              {contract.litter
                ? contract.litter.name ||
                  `${contract.litter.dam.callName} × ${contract.litter.sire.callName}`
                : "—"}
            </span>
          </div>
          {contract.reservationId && (
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Reservation</span>
              <Link href={`/reservations/${contract.reservationId}`} className="hover:underline">
                View
              </Link>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Created</span>
            <span>{formatDate(contract.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Sent</span>
            <span>{formatDate(contract.sentAt)}</span>
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="font-serif text-lg text-[var(--brown)]">Fee breakdown</h2>
          <ul className="space-y-1 text-sm">
            {feeLines.map((l, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span>
                  {l.label}
                  {l.notes ? <span className="text-[var(--muted)]"> — {l.notes}</span> : null}
                </span>
                <span>{formatMoney(l.amount)}</span>
              </li>
            ))}
            {feeLines.length === 0 && (
              <li className="flex justify-between">
                <span>Deposit</span>
                <span>{formatMoney(contract.depositAmount)}</span>
              </li>
            )}
          </ul>
          <div
            className="flex justify-between border-t pt-2 font-semibold"
            style={{ borderColor: "var(--border)" }}
          >
            <span>Total</span>
            <span>{formatMoney(contract.totalAmount)}</span>
          </div>
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="font-serif text-lg text-[var(--brown)]">DocuSign</h2>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-[var(--muted)]">Status</dt>
            <dd>{contract.docusignStatus || "Not sent"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--muted)]">Envelope ID</dt>
            <dd className="max-w-[12rem] truncate">{contract.docusignEnvelopeId || "—"}</dd>
          </div>
        </dl>
        {contract.reservationId ? (
          <DocuSignButton reservationId={contract.reservationId} />
        ) : (
          <p className="text-sm text-[var(--muted)]">
            Link a reservation to enable DocuSign send from this contract.
          </p>
        )}
      </div>
    </div>
  );
}
