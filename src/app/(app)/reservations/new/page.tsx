import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ReservationForm } from "@/components/ReservationForm";

export const dynamic = "force-dynamic";

export default async function NewReservationPage({
  searchParams,
}: {
  searchParams: { litterId?: string };
}) {
  const litters = await prisma.litter.findMany({
    include: { dam: true, sire: true, puppies: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="space-y-4">
      <div>
        <Link href="/reservations" className="text-sm text-[var(--gold-dark)] hover:underline">← Reservations</Link>
        <h1 className="page-title mt-1">New reservation</h1>
      </div>
      <ReservationForm
        initialLitterId={searchParams.litterId}
        litters={litters.map((l) => ({
          id: l.id,
          label: l.name || `${l.dam.callName} × ${l.sire.callName}`,
          puppies: l.puppies.map((p) => ({ id: p.id, tempName: p.tempName, status: p.status })),
        }))}
      />
    </div>
  );
}
