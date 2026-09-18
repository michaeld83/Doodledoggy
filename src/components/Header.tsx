import Link from "next/link";
import Image from "next/image";
import { SessionUser } from "@/lib/auth";

export function Header({ user }: { user: SessionUser }) {
  return (
    <header className="border-b bg-[var(--card)]" style={{ borderColor: "var(--border)" }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/branding/state-emblem.svg"
              alt="Kennel emblem"
              width={56}
              height={56}
              className="rounded-full"
              priority
            />
            <Image
              src="/branding/mini-golden-doodles.svg"
              alt="Mini Golden Doodles Georgia"
              width={200}
              height={72}
              className="hidden sm:block"
              priority
            />
          </Link>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-[var(--muted)] md:inline">Signed in as {user.name}</span>
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
