import Link from "next/link";
import { CustomerForm } from "@/components/CustomerForm";

export default function NewCustomerPage() {
  return (
    <div className="space-y-4">
      <div>
        <Link href="/customers" className="text-sm text-[var(--gold-dark)] hover:underline">
          ← Customers
        </Link>
        <h1 className="page-title mt-1">New customer</h1>
      </div>
      <CustomerForm />
    </div>
  );
}
