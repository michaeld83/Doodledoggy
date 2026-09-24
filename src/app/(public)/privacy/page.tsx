import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Mini Goldendoodles of Georgia",
};

const EMAIL = "minigoldendoodlesofgeorgia@gmail.com";

export default function PrivacyPage() {
  return (
    <>
      <header className="space-y-1">
        <h1 className="page-title">Privacy Policy</h1>
        <p className="text-[var(--muted)]">
          Mini Goldendoodles of Georgia (Snuggly Doodles) · Effective September 24, 2026
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="font-serif text-lg text-[var(--brown)]">Who we are</h2>
        <p>
          We are a family dog breeder. This website is a private tool used only by the business
          owners, Michael and Christy, to manage litters, puppies, customers, reservations,
          deposits and payments, and to send puppy purchase contracts for e-signature through
          DocuSign. Customers do not log in. They only receive and sign contracts by email.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-lg text-[var(--brown)]">What we collect</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Buyer name, email address, phone number, and mailing address</li>
          <li>Puppy and reservation details, such as litter, puppy, and pick number</li>
          <li>Deposit and payment records, such as amount, date, and payment method</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-lg text-[var(--brown)]">Why we collect it</h2>
        <p>
          We use this information only to handle puppy reservations, prepare and send purchase
          contracts, and keep accurate business records.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-lg text-[var(--brown)]">How we store and share it</h2>
        <p>
          Your information is stored securely with our website hosting and database providers.
          We share your name, email, and contract details with DocuSign only so we can deliver
          your contract for signature. DocuSign handles that information under its own privacy
          policy.
        </p>
        <p>
          <strong>We never sell your information.</strong> We do not share it with anyone else
          except when required by law.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-lg text-[var(--brown)]">Your choices</h2>
        <p>
          You can ask to see the information we have about you, or ask us to correct or delete
          it, by emailing{" "}
          <a href={`mailto:${EMAIL}`} className="text-[var(--gold-dark)] hover:underline">
            {EMAIL}
          </a>
          . We may need to keep signed contracts and payment records that the law or our
          business records require.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-lg text-[var(--brown)]">Changes</h2>
        <p>
          If we update this policy, we will post the new version on this page with a new
          effective date.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-lg text-[var(--brown)]">Contact</h2>
        <p>
          Questions? Email{" "}
          <a href={`mailto:${EMAIL}`} className="text-[var(--gold-dark)] hover:underline">
            {EMAIL}
          </a>
          .
        </p>
      </section>
    </>
  );
}
