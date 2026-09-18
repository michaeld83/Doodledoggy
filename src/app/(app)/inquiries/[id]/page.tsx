import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { InquiryStatusControl } from "@/components/InquiryStatusControl";
import { RawPayloadDetails } from "@/components/RawPayloadDetails";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InquiryDetailPage({ params }: { params: { id: string } }) {
  const inq = await prisma.inquiry.findUnique({
    where: { id: params.id },
    include: { reservation: { select: { id: true, buyerName: true, status: true } } },
  });
  if (!inq) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/inquiries" className="text-sm text-[var(--gold-dark)] hover:underline">
          ← Inquiries
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="page-title">{inq.name}</h1>
          <StatusBadge status={inq.status} />
        </div>
        <p className="text-sm text-[var(--muted)]">
          {inq.source} · received {formatDate(inq.createdAt)}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-[var(--muted)]">Email</span>
            <a className="hover:underline break-all" href={`mailto:${inq.email}`}>{inq.email}</a>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[var(--muted)]">Phone</span>
            <span>{inq.phone || "—"}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[var(--muted)]">Source</span>
            <span>{inq.source}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[var(--muted)]">External ID</span>
            <span className="truncate max-w-[14rem]">{inq.externalId || "—"}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[var(--muted)]">Updated</span>
            <span>{formatDate(inq.updatedAt)}</span>
          </div>
          {inq.reservation && (
            <div className="flex justify-between gap-2">
              <span className="text-[var(--muted)]">Reservation</span>
              <Link href={`/reservations/${inq.reservation.id}`} className="hover:underline">
                {inq.reservation.buyerName}
              </Link>
            </div>
          )}
          {inq.message && (
            <div className="border-t pt-3 mt-2" style={{ borderColor: "var(--border)" }}>
              <div className="mb-1 text-xs font-semibold uppercase text-[var(--muted)]">Message</div>
              <p className="whitespace-pre-wrap">{inq.message}</p>
            </div>
          )}
        </div>

        <div className="card space-y-4">
          <h2 className="font-serif text-lg text-[var(--brown)]">Manage</h2>
          <InquiryStatusControl inquiryId={inq.id} currentStatus={inq.status} />
          <RawPayloadDetails rawPayload={inq.rawPayload} />
        </div>
      </div>
    </div>
  );
}
