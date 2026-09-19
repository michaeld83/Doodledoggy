import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { PuppyManager } from "@/components/PuppyManager";

export const dynamic = "force-dynamic";

export default async function LitterDetailPage({ params }: { params: { id: string } }) {
  const litter = await prisma.litter.findUnique({
    where: { id: params.id },
    include: {
      dam: true,
      sire: true,
      puppies: {
        orderBy: [{ pickPosition: "asc" }, { tempName: "asc" }],
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          reservation: {
            include: { customer: { select: { id: true, name: true, phone: true } } },
          },
        },
      },
      reservations: true,
      coiChecks: { orderBy: { createdAt: "desc" }, take: 3 },
    },
  });
  if (!litter) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/litters" className="text-sm text-[var(--gold-dark)] hover:underline">← Litters</Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="page-title">{litter.name || `${litter.dam.callName} × ${litter.sire.callName}`}</h1>
          <StatusBadge status={litter.status} />
        </div>
      </div>

      {litter.breedType && (
        <div className="card text-sm">
          <div className="text-xs uppercase text-[var(--muted)]">Breed type</div>
          <div className="font-medium">{litter.breedType}</div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="text-xs uppercase text-[var(--muted)]">Dam</div>
          <Link href={`/dogs/${litter.damId}`} className="font-medium hover:underline">{litter.dam.callName}</Link>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-[var(--muted)]">Sire</div>
          <Link href={`/dogs/${litter.sireId}`} className="font-medium hover:underline">{litter.sire.callName}</Link>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-[var(--muted)]">Whelp</div>
          <div className="font-medium">{formatDate(litter.whelpDate)}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-[var(--muted)]">Expected</div>
          <div className="font-medium">{formatDate(litter.expectedDate)}</div>
        </div>
      </div>

      {litter.notes && (
        <div className="card text-sm"><span className="label">Notes</span><p>{litter.notes}</p></div>
      )}

      {litter.coiChecks[0] && (
        <div className={`card text-sm ${litter.coiChecks[0].highRelatedness ? "border-[var(--warn)]" : ""}`}>
          <h2 className="mb-1 font-serif text-lg text-[var(--brown)]">COI at mating</h2>
          <p>
            Wright&apos;s COI: <strong>{litter.coiChecks[0].coiPercent.toFixed(2)}%</strong>
            {litter.coiChecks[0].highRelatedness && (
              <span className="ml-2 badge-warn">High relatedness{litter.coiChecks[0].confirmed ? " (confirmed)" : ""}</span>
            )}
          </p>
          {litter.coiChecks[0].warningMessage && (
            <p className="mt-1 text-[var(--brown-soft)]">{litter.coiChecks[0].warningMessage}</p>
          )}
          <Link href={`/mating?damId=${litter.damId}&sireId=${litter.sireId}`} className="mt-2 inline-block text-sm text-[var(--gold-dark)] hover:underline">
            Re-check on Mating / COI →
          </Link>
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-lg text-[var(--brown)]">Puppies</h2>
          <Link href={`/reservations/new?litterId=${litter.id}`} className="btn-secondary">Add reservation</Link>
        </div>
        <PuppyManager litterId={litter.id} puppies={litter.puppies} />
      </section>

      {litter.reservations.length > 0 && (
        <section className="card">
          <h2 className="mb-3 font-serif text-lg text-[var(--brown)]">Reservations</h2>
          <ul className="space-y-2 text-sm">
            {litter.reservations.map((r) => (
              <li key={r.id} className="flex justify-between">
                <Link href={`/reservations/${r.id}`} className="hover:underline">{r.buyerName}</Link>
                <span className="text-[var(--muted)]">${r.depositAmount.toFixed(0)} · {r.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
