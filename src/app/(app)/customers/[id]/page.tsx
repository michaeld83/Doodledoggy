import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      reservations: {
        include: { litter: { include: { dam: true, sire: true } } },
        orderBy: { createdAt: "desc" },
      },
      contracts: {
        include: { litter: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!customer) notFound();

  const addressBits = [
    customer.street,
    [customer.city, customer.state].filter(Boolean).join(", "),
    customer.zip,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/customers" className="text-sm text-[var(--gold-dark)] hover:underline">
            ← Customers
          </Link>
          <h1 className="page-title mt-1">{customer.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/customers/${customer.id}/edit`} className="btn-secondary">
            Edit
          </Link>
          <Link
            href={`/reservations/new?customerId=${customer.id}`}
            className="btn-primary"
          >
            New reservation
          </Link>
        </div>
      </div>

      <div className="card space-y-2 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-[var(--muted)]">Email</span>
          <span>{customer.email || "—"}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-[var(--muted)]">Phone</span>
          <span>{customer.phone || "—"}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-[var(--muted)]">Address</span>
          <span className="text-right">{customer.address || addressBits || "—"}</span>
        </div>
        {customer.notes && (
          <p className="border-t pt-2" style={{ borderColor: "var(--border)" }}>
            {customer.notes}
          </p>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="font-serif text-lg text-[var(--brown)]">Reservations</h2>
        {customer.reservations.length === 0 && (
          <p className="text-sm text-[var(--muted)]">No reservations yet</p>
        )}
        <div className="grid gap-3">
          {customer.reservations.map((r) => (
            <Link key={r.id} href={`/reservations/${r.id}`} className="card block hover:border-[var(--gold)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">
                    {r.litter.name || `${r.litter.dam.callName} × ${r.litter.sire.callName}`}
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    Pick {r.pickPosition ?? "—"} · {formatDate(r.createdAt)}
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge status={r.status} />
                  <div className="mt-1 text-sm">{formatMoney(r.feesTotal ?? r.depositAmount)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-lg text-[var(--brown)]">Contracts</h2>
        {customer.contracts.length === 0 && (
          <p className="text-sm text-[var(--muted)]">No contracts yet</p>
        )}
        <div className="grid gap-3">
          {customer.contracts.map((c) => (
            <Link key={c.id} href={`/contracts/${c.id}`} className="card block hover:border-[var(--gold)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{c.title}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {formatDate(c.createdAt)}
                    {c.docusignStatus ? ` · DocuSign ${c.docusignStatus}` : ""}
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge status={c.status} />
                  <div className="mt-1 text-sm">{formatMoney(c.totalAmount)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
