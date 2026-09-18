import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const [activeDogs, upcomingLitters, openReservations, healthFollowUps, newInquiryCount] = await Promise.all([
    prisma.dog.findMany({
      where: { status: "ACTIVE" },
      orderBy: { callName: "asc" },
      take: 12,
    }),
    prisma.litter.findMany({
      where: { status: { in: ["PLANNED", "EXPECTING"] } },
      include: { dam: true, sire: true },
      orderBy: { expectedDate: "asc" },
    }),
    prisma.reservation.findMany({
      where: { status: "OPEN" },
      include: { litter: true, puppy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.healthRecord.findMany({
      where: { followUpAt: { not: null } },
      include: { dog: true },
      orderBy: { followUpAt: "asc" },
      take: 10,
    }),
    prisma.inquiry.count({ where: { status: "NEW" } }),
  ]);

  const overdue = healthFollowUps.filter((h) => h.followUpAt && h.followUpAt < now);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-[var(--muted)]">Kennel overview for Mini Golden Doodles Georgia</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dogs/new" className="btn-primary">Add dog</Link>
          <Link href="/litters/new" className="btn-secondary">New litter</Link>
          <Link href="/mating" className="btn-secondary">Check COI</Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="card">
          <div className="text-xs font-semibold uppercase text-[var(--muted)]">Active dogs</div>
          <div className="mt-1 text-3xl font-semibold text-[var(--brown)]">{activeDogs.length}</div>
        </div>
        <div className="card">
          <div className="text-xs font-semibold uppercase text-[var(--muted)]">Upcoming litters</div>
          <div className="mt-1 text-3xl font-semibold text-[var(--brown)]">{upcomingLitters.length}</div>
        </div>
        <div className="card">
          <div className="text-xs font-semibold uppercase text-[var(--muted)]">Open reservations</div>
          <div className="mt-1 text-3xl font-semibold text-[var(--brown)]">{openReservations.length}</div>
        </div>
        <div className="card">
          <div className="text-xs font-semibold uppercase text-[var(--muted)]">Health follow-ups</div>
          <div className="mt-1 text-3xl font-semibold text-[var(--brown)]">
            {healthFollowUps.length}
            {overdue.length > 0 && (
              <span className="ml-2 text-sm font-medium text-[var(--danger)]">{overdue.length} overdue</span>
            )}
          </div>
        </div>
        <Link href="/inquiries?status=NEW" className="card block hover:shadow-md transition">
          <div className="text-xs font-semibold uppercase text-[var(--muted)]">New inquiries</div>
          <div className="mt-1 text-3xl font-semibold text-[var(--brown)]">{newInquiryCount}</div>
          <div className="mt-1 text-xs text-[var(--gold-dark)]">View leads →</div>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-lg text-[var(--brown)]">Active dogs</h2>
            <Link href="/dogs" className="text-sm text-[var(--gold-dark)] hover:underline">View all</Link>
          </div>
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {activeDogs.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2">
                <Link href={`/dogs/${d.id}`} className="font-medium hover:text-[var(--gold-dark)]">
                  {d.callName}
                  <span className="ml-2 text-xs text-[var(--muted)]">{d.breed}</span>
                </Link>
                <span className="text-xs text-[var(--muted)]">{d.sex === "MALE" ? "♂" : "♀"}</span>
              </li>
            ))}
            {activeDogs.length === 0 && <li className="py-2 text-sm text-[var(--muted)]">No active dogs</li>}
          </ul>
        </section>

        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-lg text-[var(--brown)]">Upcoming litters</h2>
            <Link href="/litters" className="text-sm text-[var(--gold-dark)] hover:underline">View all</Link>
          </div>
          <ul className="space-y-3">
            {upcomingLitters.map((l) => (
              <li key={l.id} className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/litters/${l.id}`} className="font-medium hover:text-[var(--gold-dark)]">
                    {l.name || `${l.dam.callName} × ${l.sire.callName}`}
                  </Link>
                  <StatusBadge status={l.status} />
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Expected {formatDate(l.expectedDate)} · Dam {l.dam.callName} · Sire {l.sire.callName}
                </p>
              </li>
            ))}
            {upcomingLitters.length === 0 && <li className="text-sm text-[var(--muted)]">None planned</li>}
          </ul>
        </section>

        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-lg text-[var(--brown)]">Open reservations</h2>
            <Link href="/reservations" className="text-sm text-[var(--gold-dark)] hover:underline">View all</Link>
          </div>
          <ul className="space-y-3">
            {openReservations.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                <div>
                  <Link href={`/reservations/${r.id}`} className="font-medium hover:text-[var(--gold-dark)]">
                    {r.buyerName}
                  </Link>
                  <div className="text-xs text-[var(--muted)]">
                    ${r.depositAmount.toFixed(0)} · pick {r.pickPosition ?? "—"} · {r.litter.name || "Litter"}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </li>
            ))}
            {openReservations.length === 0 && <li className="text-sm text-[var(--muted)]">No open deposits</li>}
          </ul>
        </section>

        <section className="card">
          <h2 className="mb-3 font-serif text-lg text-[var(--brown)]">Health follow-ups</h2>
          <ul className="space-y-3">
            {healthFollowUps.map((h) => {
              const late = h.followUpAt && h.followUpAt < now;
              return (
                <li key={h.id} className="text-sm">
                  <Link href={`/dogs/${h.dogId}`} className="font-medium hover:text-[var(--gold-dark)]">
                    {h.dog.callName}: {h.title}
                  </Link>
                  <div className={`text-xs ${late ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}>
                    Due {formatDate(h.followUpAt)}
                    {late ? " · overdue" : ""}
                  </div>
                </li>
              );
            })}
            {healthFollowUps.length === 0 && <li className="text-sm text-[var(--muted)]">No follow-ups scheduled</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
