import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CustomerForm } from "@/components/CustomerForm";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({ params }: { params: { id: string } }) {
  const customer = await prisma.customer.findUnique({ where: { id: params.id } });
  if (!customer) notFound();
  return (
    <div className="space-y-4">
      <div>
        <Link
          href={`/customers/${customer.id}`}
          className="text-sm text-[var(--gold-dark)] hover:underline"
        >
          ← {customer.name}
        </Link>
        <h1 className="page-title mt-1">Edit customer</h1>
      </div>
      <CustomerForm customer={customer} />
    </div>
  );
}
