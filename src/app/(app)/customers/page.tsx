import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q?.trim();
  const customers = await prisma.customer.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
          ],
        }
      : undefined,
    include: {
      _count: { select: { reservations: true, contracts: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="text-sm text-[var(--muted)]">{customers.length} clients</p>
        </div>
        <Link href="/customers/new" className="btn-primary">
          New customer
        </Link>
      </div>

      <form className="card flex flex-wrap gap-3">
        <input
          name="q"
          className="input max-w-xs"
          placeholder="Search name, email, phone"
          defaultValue={q || ""}
        />
        <button type="submit" className="btn-secondary">
          Search
        </button>
      </form>

      <div className="grid gap-3 sm:hidden">
        {customers.map((c) => (
          <Link key={c.id} href={`/customers/${c.id}`} className="card block">
            <div className="font-medium text-[var(--brown)]">{c.name}</div>
            <div className="text-sm text-[var(--muted)]">{c.email || "—"}</div>
            <div className="text-sm">{c.phone || "—"}</div>
            <div className="mt-1 text-xs text-[var(--muted)]">
              {c._count.reservations} reservations · {c._count.contracts} contracts
            </div>
          </Link>
        ))}
        {customers.length === 0 && (
          <p className="text-[var(--muted)]">No customers yet</p>
        )}
      </div>

      <div className="table-wrap hidden bg-white sm:block">
        <table className="data">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Location</th>
              <th>Reservations</th>
              <th>Contracts</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/customers/${c.id}`} className="font-medium hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="text-sm">{c.email || "—"}</td>
                <td className="text-sm">{c.phone || "—"}</td>
                <td className="text-sm">
                  {[c.city, c.state].filter(Boolean).join(", ") || c.address || "—"}
                </td>
                <td>{c._count.reservations}</td>
                <td>{c._count.contracts}</td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-[var(--muted)]">
                  No customers
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
