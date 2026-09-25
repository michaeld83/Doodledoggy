import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReservationForm } from "@/components/ReservationForm";
import { getEsignConnection } from "@/lib/esign";

export const dynamic = "force-dynamic";

export default async function EditReservationPage({ params }: { params: { id: string } }) {
  const [reservation, litters, customers] = await Promise.all([
    prisma.reservation.findUnique({ where: { id: params.id } }),
    prisma.litter.findMany({
      include: { dam: true, sire: true, puppies: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!reservation) notFound();

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={`/reservations/${reservation.id}`}
          className="text-sm text-[var(--gold-dark)] hover:underline"
        >
          ← Reservation
        </Link>
        <h1 className="page-title mt-1">Edit paid client form</h1>
      </div>
      <ReservationForm
        esign={getEsignConnection()}
        customers={customers.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
        }))}
        litters={litters.map((l) => ({
          id: l.id,
          label: l.name || `${l.dam.callName} × ${l.sire.callName}`,
          breedType: l.breedType,
          puppies: l.puppies.map((p) => ({ id: p.id, tempName: p.callName ? `${p.callName} (${p.tempName})` : p.tempName, status: p.status })),
        }))}
        initial={reservation}
      />
    </div>
  );
}
