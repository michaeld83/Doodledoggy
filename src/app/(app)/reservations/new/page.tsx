import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ReservationForm } from "@/components/ReservationForm";
import { getEsignConnection } from "@/lib/esign";

export const dynamic = "force-dynamic";

export default async function NewReservationPage({
  searchParams,
}: {
  searchParams: { litterId?: string; customerId?: string };
}) {
  const [litters, customers] = await Promise.all([
    prisma.litter.findMany({
      include: { dam: true, sire: true, puppies: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
  ]);

  const preselectedCustomer = searchParams.customerId
    ? customers.find((c) => c.id === searchParams.customerId)
    : null;

  return (
    <div className="space-y-4">
      <div>
        <Link href="/reservations" className="text-sm text-[var(--gold-dark)] hover:underline">
          ← Reservations
        </Link>
        <h1 className="page-title mt-1">Paid client form</h1>
        <p className="text-sm text-[var(--muted)]">
          Capture deposit, add-ons, and send the contract for e-signature.
        </p>
      </div>
      <ReservationForm
        esign={getEsignConnection()}
        initialLitterId={searchParams.litterId}
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
        initial={
          preselectedCustomer
            ? {
                id: "",
                litterId: searchParams.litterId || litters[0]?.id || "",
                customerId: preselectedCustomer.id,
                buyerName: preselectedCustomer.name,
                buyerEmail: preselectedCustomer.email,
                buyerPhone: preselectedCustomer.phone,
                depositAmount: 500,
              }
            : undefined
        }
      />
    </div>
  );
}
