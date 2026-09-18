import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function ReservationsPage() {
  const reservations = await prisma.reservation.findMany({
    include: { litter: { include: { dam: true, sire: true } }, puppy: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Reservations / deposits</h1>
          <p className="text-sm text-[var(--muted)]">{reservations.length} records</p>
        </div>
        <Link href="/reservations/new" className="btn-primary">New reservation</Link>
      </div>
      <div className="table-wrap bg-white">
        <table className="data">
          <thead>
            <tr>
              <th>Buyer</th>
              <th>Litter</th>
              <th>Pick</th>
              <th>Deposit</th>
              <th>Payment</th>
              <th>DocuSign</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/reservations/${r.id}`} className="font-medium hover:underline">{r.buyerName}</Link>
                  <div className="text-xs text-[var(--muted)]">{r.buyerEmail || r.buyerPhone || ""}</div>
                </td>
                <td className="text-sm">{r.litter.name || `${r.litter.dam.callName} × ${r.litter.sire.callName}`}</td>
                <td>{r.pickPosition ?? "—"}</td>
                <td>${r.depositAmount.toFixed(2)}</td>
                <td className="text-xs">{r.paymentMethod || "—"}{r.paidWhere ? ` @ ${r.paidWhere}` : ""}</td>
                <td className="text-xs">{r.docusignStatus || "—"}</td>
                <td><StatusBadge status={r.status} /></td>
              </tr>
            ))}
            {reservations.length === 0 && (
              <tr><td colSpan={7} className="text-center text-[var(--muted)]">No reservations</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
