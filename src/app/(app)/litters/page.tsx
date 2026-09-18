import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function LittersPage() {
  const litters = await prisma.litter.findMany({
    include: {
      dam: true,
      sire: true,
      puppies: true,
      reservations: true,
    },
    orderBy: [{ status: "asc" }, { expectedDate: "desc" }],
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Litters</h1>
          <p className="text-sm text-[var(--muted)]">{litters.length} litters</p>
        </div>
        <Link href="/litters/new" className="btn-primary">New litter</Link>
      </div>
      <div className="grid gap-4">
        {litters.map((l) => (
          <Link key={l.id} href={`/litters/${l.id}`} className="card block hover:border-[var(--gold)]">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-serif text-lg text-[var(--brown)]">
                  {l.name || `${l.dam.callName} × ${l.sire.callName}`}
                </h2>
                <p className="text-sm text-[var(--muted)]">
                  Dam {l.dam.callName} · Sire {l.sire.callName}
                  {l.breedType ? ` · ${l.breedType}` : ""}
                </p>
              </div>
              <StatusBadge status={l.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-[var(--muted)]">
              <span>Whelp {formatDate(l.whelpDate)}</span>
              <span>Expected {formatDate(l.expectedDate)}</span>
              <span>{l.puppies.length} puppies</span>
              <span>{l.reservations.length} reservations</span>
            </div>
          </Link>
        ))}
        {litters.length === 0 && <p className="text-[var(--muted)]">No litters yet</p>}
      </div>
    </div>
  );
}
