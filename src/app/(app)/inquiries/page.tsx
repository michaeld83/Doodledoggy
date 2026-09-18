import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/utils";
import { INQUIRY_STATUSES } from "@/lib/inquiry";

export const dynamic = "force-dynamic";

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const statusFilter = searchParams.status?.toUpperCase();
  const where =
    statusFilter && statusFilter !== "ALL" && (INQUIRY_STATUSES as readonly string[]).includes(statusFilter)
      ? { status: statusFilter }
      : {};

  const inquiries = await prisma.inquiry.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const counts = await prisma.inquiry.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Inquiries</h1>
          <p className="text-sm text-[var(--muted)]">
            Website / form leads · {inquiries.length} shown
          </p>
        </div>
        <Link href="/inquiries/new" className="btn-primary">Manual inquiry</Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/inquiries"
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            !statusFilter || statusFilter === "ALL"
              ? "bg-[var(--brown)] text-white"
              : "bg-white border text-[var(--brown)]"
          }`}
          style={{ borderColor: "var(--border)" }}
        >
          All
        </Link>
        {INQUIRY_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/inquiries?status=${s}`}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              statusFilter === s
                ? "bg-[var(--brown)] text-white"
                : "bg-white border text-[var(--brown)]"
            }`}
            style={{ borderColor: "var(--border)" }}
          >
            {s} ({countMap[s] || 0})
          </Link>
        ))}
      </div>

      {/* Mobile-friendly cards */}
      <div className="space-y-3 sm:hidden">
        {inquiries.map((inq) => (
          <Link
            key={inq.id}
            href={`/inquiries/${inq.id}`}
            className="card block space-y-1"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium">{inq.name}</span>
              <StatusBadge status={inq.status} />
            </div>
            <div className="text-xs text-[var(--muted)]">{inq.email}</div>
            <div className="text-xs text-[var(--muted)]">
              {inq.source} · {formatDate(inq.createdAt)}
            </div>
            {inq.message && (
              <p className="line-clamp-2 text-sm text-[var(--brown-soft)]">{inq.message}</p>
            )}
          </Link>
        ))}
        {inquiries.length === 0 && (
          <p className="text-sm text-[var(--muted)]">No inquiries yet.</p>
        )}
      </div>

      <div className="table-wrap hidden bg-white sm:block">
        <table className="data">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Source</th>
              <th>Message</th>
              <th>Created</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.map((inq) => (
              <tr key={inq.id}>
                <td>
                  <Link href={`/inquiries/${inq.id}`} className="font-medium hover:underline">
                    {inq.name}
                  </Link>
                </td>
                <td className="text-sm">
                  <div>{inq.email}</div>
                  {inq.phone && <div className="text-xs text-[var(--muted)]">{inq.phone}</div>}
                </td>
                <td className="text-xs">{inq.source}</td>
                <td className="max-w-xs truncate text-sm text-[var(--muted)]">
                  {inq.message || "—"}
                </td>
                <td className="text-xs whitespace-nowrap">{formatDate(inq.createdAt)}</td>
                <td><StatusBadge status={inq.status} /></td>
              </tr>
            ))}
            {inquiries.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-[var(--muted)]">No inquiries</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
