import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen px-4 py-8">
      <main className="mx-auto w-full max-w-2xl">
        <div className="card space-y-5 text-sm leading-relaxed sm:text-base">{children}</div>
        <nav className="mt-4 flex flex-wrap justify-center gap-4 text-sm text-[var(--muted)]">
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          <Link href="/terms" className="hover:underline">Terms of Use</Link>
          <a href="mailto:minigoldendoodlesofgeorgia@gmail.com" className="hover:underline">Contact</a>
        </nav>
      </main>
    </div>
  );
}
