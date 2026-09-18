import Link from "next/link";
import { InquiryForm } from "@/components/InquiryForm";

export default function NewInquiryPage() {
  return (
    <div className="space-y-4">
      <div>
        <Link href="/inquiries" className="text-sm text-[var(--gold-dark)] hover:underline">
          ← Inquiries
        </Link>
        <h1 className="page-title mt-1">New manual inquiry</h1>
        <p className="text-sm text-[var(--muted)]">
          Log a phone/email lead by hand. Website form posts use the webhook instead.
        </p>
      </div>
      <InquiryForm />
    </div>
  );
}
