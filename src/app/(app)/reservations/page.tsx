import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReservationsPage() {
  const reservations = await prisma.reservation.findMany({
    include: {
      litter: { include: { dam: true, sire: true } },
      puppy: true,
      customer: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Reservations / paid clients</h1>
          <p className="text-sm text-[var(--muted)]">{reservations.length} records</p>
        </div>
        <Link href="/reservations/new" className="btn-primary">
          New paid client form
        </Link>
      </div>

      <div className="grid gap-3 sm:hidden">
        {reservations.map((r) => {
          const name = r.customer?.name || r.buyerName || "—";
          return (
            <Link key={r.id} href={`/reservations/${r.id}`} className="card block">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{name}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {r.litter.name || `${r.litter.dam.callName} × ${r.litter.sire.callName}`}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span>{formatMoney(r.feesTotal ?? r.depositAmount)}</span>
                <span className="text-xs text-[var(--muted)]">{r.docusignStatus || "Not sent"}</span>
              </div>
            </Link>
          );
        })}
        {reservations.length === 0 && <p className="text-[var(--muted)]">No reservations</p>}
      </div>

      <div className="table-wrap hidden bg-white sm:block">
        <table className="data">
          <thead>
            <tr>
              <th>Client</th>
              <th>Litter</th>
              <th>Pick</th>
              <th>Total</th>
              <th>Paid</th>
              <th>E-sign</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((r) => {
              const name = r.customer?.name || r.buyerName || "—";
              return (
                <tr key={r.id}>
                  <td>
                    <Link href={`/reservations/${r.id}`} className="font-medium hover:underline">
                      {name}
                    </Link>
                    <div className="text-xs text-[var(--muted)]">
                      {r.customer?.email || r.buyerEmail || r.buyerPhone || ""}
                    </div>
                  </td>
                  <td className="text-sm">
                    {r.litter.name || `${r.litter.dam.callName} × ${r.litter.sire.callName}`}
                    {r.litter.breedType ? (
                      <div className="text-xs text-[var(--muted)]">{r.litter.breedType}</div>
                    ) : null}
                  </td>
                  <td>{r.pickPosition ?? "—"}</td>
                  <td>{formatMoney(r.feesTotal ?? r.depositAmount)}</td>
                  <td className="text-xs">{r.paid ? "Yes" : "No"}</td>
                  <td className="text-xs">{r.docusignStatus || "—"}</td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              );
            })}
            {reservations.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-[var(--muted)]">
                  No reservations
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
