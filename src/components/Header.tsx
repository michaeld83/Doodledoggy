import Link from "next/link";
import Image from "next/image";
import { SessionUser } from "@/lib/auth";

export function Header({ user }: { user: SessionUser }) {
  return (
    <header
      className="sticky top-0 z-30 border-b bg-[var(--card)]/95 backdrop-blur md:static"
      style={{ borderColor: "var(--border)", paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 md:py-3">
        <Link href="/" className="flex min-w-0 items-center gap-2 md:gap-3" aria-label="Doodledoggy home">
          <Image
            src="/branding/snuggly-doodles.png"
            alt="Snuggly Doodles"
            width={56}
            height={56}
            className="h-11 w-11 shrink-0 rounded-full object-cover md:h-14 md:w-14"
            priority
          />
          <Image
            src="/branding/mini-goldendoodles-georgia.png"
            alt="Mini Goldendoodles of Georgia"
            width={180}
            height={72}
            className="h-11 w-auto min-w-0 object-contain md:h-14"
            priority
          />
        </Link>
        <div className="hidden items-center gap-3 text-sm md:flex">
          <span className="text-[var(--muted)]">Signed in as {user.name}</span>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="btn-ghost">
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
