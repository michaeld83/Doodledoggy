import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { PuppyDetailEditor } from "@/components/PuppyDetailEditor";
import { puppyDisplayName, resolvePicker } from "@/lib/puppy";

export const dynamic = "force-dynamic";

export default async function PuppyDetailPage({ params }: { params: { id: string } }) {
  const puppy = await prisma.puppy.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      litter: { include: { dam: true, sire: true } },
      reservation: { include: { customer: true } },
    },
  });
  if (!puppy) notFound();

  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, phone: true },
  });

  const picker = resolvePicker(puppy);
  const litterLabel =
    puppy.litter.name ||
    `${puppy.litter.dam.callName} × ${puppy.litter.sire.callName}`;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/litters/${puppy.litterId}`}
          className="text-sm text-[var(--gold-dark)] hover:underline"
        >
          ← {litterLabel}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="page-title">{puppyDisplayName(puppy)}</h1>
          <StatusBadge status={puppy.status} />
        </div>
        {puppy.callName && (
          <p className="text-sm text-[var(--muted)]">Original name: {puppy.tempName}</p>
        )}
      </div>

      {(picker.name || picker.phone) && (
        <div className="card text-sm">
          <div className="text-xs uppercase text-[var(--muted)]">Picker at a glance</div>
          <div className="mt-1 text-lg font-medium">{picker.name || "—"}</div>
          {picker.phone && (
            <a href={`tel:${picker.phone}`} className="mt-1 inline-block text-[var(--gold-dark)]">
              {picker.phone}
            </a>
          )}
          {puppy.reservation && (
            <div className="mt-2">
              <Link
                href={`/reservations/${puppy.reservation.id}`}
                className="text-sm text-[var(--gold-dark)] hover:underline"
              >
                View reservation →
              </Link>
            </div>
          )}
        </div>
      )}

      <PuppyDetailEditor
        puppy={{
          id: puppy.id,
          litterId: puppy.litterId,
          tempName: puppy.tempName,
          callName: puppy.callName,
          sex: puppy.sex,
          color: puppy.color,
          status: puppy.status,
          pickPosition: puppy.pickPosition,
          notes: puppy.notes,
          customerId: puppy.customerId,
          wantsSnugglePuppy: puppy.wantsSnugglePuppy,
          wantsTravelDocuments: puppy.wantsTravelDocuments,
        }}
        customers={customers}
        pickerFallback={{ name: picker.name, phone: picker.phone }}
      />
    </div>
  );
}
