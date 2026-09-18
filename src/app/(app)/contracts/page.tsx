import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  const contracts = await prisma.contract.findMany({
    include: { customer: true, litter: true, reservation: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Customer contracts</h1>
        <p className="text-sm text-[var(--muted)]">
          {contracts.length} contracts — created from paid-client / DocuSign flow
        </p>
      </div>

      <div className="grid gap-3 sm:hidden">
        {contracts.map((c) => (
          <Link key={c.id} href={`/contracts/${c.id}`} className="card block">
            <div className="font-medium">{c.title}</div>
            <div className="text-sm text-[var(--muted)]">{c.customer.name}</div>
            <div className="mt-1 flex items-center justify-between">
              <StatusBadge status={c.status} />
              <span className="text-sm">{formatMoney(c.totalAmount)}</span>
            </div>
          </Link>
        ))}
        {contracts.length === 0 && <p className="text-[var(--muted)]">No contracts yet</p>}
      </div>

      <div className="table-wrap hidden bg-white sm:block">
        <table className="data">
          <thead>
            <tr>
              <th>Title</th>
              <th>Customer</th>
              <th>Litter</th>
              <th>Total</th>
              <th>DocuSign</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/contracts/${c.id}`} className="font-medium hover:underline">
                    {c.title}
                  </Link>
                </td>
                <td>
                  <Link href={`/customers/${c.customerId}`} className="hover:underline">
                    {c.customer.name}
                  </Link>
                </td>
                <td className="text-sm">{c.litter?.name || "—"}</td>
                <td>{formatMoney(c.totalAmount)}</td>
                <td className="text-xs">{c.docusignStatus || "—"}</td>
                <td>
                  <StatusBadge status={c.status} />
                </td>
                <td className="text-sm">{formatDate(c.createdAt)}</td>
              </tr>
            ))}
            {contracts.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-[var(--muted)]">
                  No contracts
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
