import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use — Mini Goldendoodles of Georgia",
};

const EMAIL = "minigoldendoodlesofgeorgia@gmail.com";

export default function TermsPage() {
  return (
    <>
      <header className="space-y-1">
        <h1 className="page-title">Terms of Use</h1>
        <p className="text-[var(--muted)]">
          Mini Goldendoodles of Georgia (Snuggly Doodles) · Effective September 24, 2026
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="font-serif text-lg text-[var(--brown)]">Private business tool</h2>
        <p>
          This website is a private tool for Mini Goldendoodles of Georgia. Only authorized
          staff (the business owners) may log in and use it. There is no public sign-up. Please
          do not try to access areas you are not authorized to use.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-lg text-[var(--brown)]">Contracts</h2>
        <p>
          Puppy purchase contracts are sent and signed through DocuSign. Each purchase is
          governed by the terms written in that contract. If anything on this page differs from
          a signed contract, the signed contract controls. Your use of DocuSign is also subject
          to DocuSign&apos;s own terms.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-lg text-[var(--brown)]">Disclaimer</h2>
        <p>
          This website is provided &quot;as is.&quot; We work to keep it accurate and available,
          but we do not promise it will always be error-free or uninterrupted.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-lg text-[var(--brown)]">Limitation of liability</h2>
        <p>
          To the extent the law allows, Mini Goldendoodles of Georgia is not liable for indirect
          or incidental losses from using or being unable to use this website. This does not
          change any rights or duties in a signed puppy purchase contract.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-lg text-[var(--brown)]">Governing law</h2>
        <p>These terms are governed by the laws of the State of Georgia.</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-lg text-[var(--brown)]">Changes</h2>
        <p>
          We may update these terms and will post the new version on this page with a new
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
