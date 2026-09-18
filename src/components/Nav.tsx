"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/dogs", label: "Dogs" },
  { href: "/litters", label: "Litters" },
  { href: "/reservations", label: "Reservations" },
  { href: "/inquiries", label: "Inquiries" },
  { href: "/mating", label: "Mating / COI" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="border-b bg-[var(--cream-dark)]/60" style={{ borderColor: "var(--border)" }}>
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2">
        {links.map((l) => {
          const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition",
                active
                  ? "bg-white text-[var(--brown)] shadow-sm"
                  : "text-[var(--brown-soft)] hover:bg-white/70"
              )}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
