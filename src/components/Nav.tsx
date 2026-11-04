"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Dog,
  Users,
  CalendarCheck,
  Menu,
  X,
  PawPrint,
  FileText,
  Inbox,
  Dna,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/dogs", label: "Dogs", icon: Dog },
  { href: "/litters", label: "Litters", icon: PawPrint },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/reservations", label: "Reservations", icon: CalendarCheck },
  { href: "/contracts", label: "Contracts", icon: FileText },
  { href: "/inquiries", label: "Inquiries", icon: Inbox },
  { href: "/mating", label: "Mating / COI", icon: Dna },
  { href: "/settings", label: "Settings", icon: Settings },
];

// Shown directly in the phone bottom bar; everything else lives under "More".
const tabHrefs = ["/", "/dogs", "/customers", "/reservations"];
const tabLabels: Record<string, string> = { "/": "Home", "/reservations": "Reserve" };

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Desktop / tablet top navigation (hidden on phones). */
export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="hidden border-b bg-[var(--cream-dark)]/60 md:block" style={{ borderColor: "var(--border)" }}>
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2">
        {links.map((l) => {
          const active = isActive(pathname, l.href);
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

/** Phone bottom tab bar with a "More" sheet for the remaining sections. */
export function MobileTabBar({ userName }: { userName?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const tabs = links.filter((l) => tabHrefs.includes(l.href));
  const more = links.filter((l) => !tabHrefs.includes(l.href));
  const moreActive = more.some((l) => isActive(pathname, l.href));

  return (
    <div className="md:hidden">
      {open && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="More sections">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t bg-[var(--card)] px-4 pt-3 shadow-xl"
            style={{ borderColor: "var(--border)", paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--parchment)]" />
            <ul className="grid grid-cols-2 gap-2">
              {more.map((l) => {
                const Icon = l.icon;
                const active = isActive(pathname, l.href);
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex min-h-[52px] items-center gap-3 rounded-xl border px-3 text-base font-medium",
                        active ? "bg-white text-[var(--brown)] shadow-sm" : "bg-[var(--cream)] text-[var(--brown-soft)]"
                      )}
                      style={{ borderColor: "var(--border)" }}
                    >
                      <Icon className="h-5 w-5 shrink-0" aria-hidden />
                      {l.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
              {userName && <span className="truncate text-sm text-[var(--muted)]">Signed in as {userName}</span>}
              <form action="/api/auth/logout" method="POST">
                <button type="submit" className="btn-secondary">
                  <LogOut className="h-4 w-4" aria-hidden /> Log out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t bg-[var(--card)]/95 backdrop-blur"
        style={{ borderColor: "var(--border)", paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Main"
      >
        <ul className="grid h-16 grid-cols-5">
          {tabs.map((l) => {
            const Icon = l.icon;
            const active = isActive(pathname, l.href) && !open;
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={cn(
                    "flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                    active ? "text-[var(--gold-dark)]" : "text-[var(--muted)]"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className={cn("h-6 w-6", active && "stroke-[2.5]")} aria-hidden />
                  {tabLabels[l.href] ?? l.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              data-mobile-menu-button
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className={cn(
                "flex h-full w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                open || moreActive ? "text-[var(--gold-dark)]" : "text-[var(--muted)]"
              )}
            >
              {open ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
              More
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
