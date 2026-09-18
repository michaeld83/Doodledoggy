import { format, parseISO, isValid } from "date-fns";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? parseISO(d) : d;
  if (!isValid(date)) return "—";
  return format(date, "MMM d, yyyy");
}

export function toInputDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (!isValid(date)) return "";
  return format(date, "yyyy-MM-dd");
}

export const BREED_TYPES = [
  "Mini Golden Doodle",
  "Micro Golden Doodle",
  "Mini Bernedoodle",
  "Micro Bernedoodle",
  "Munchkin Bernedoodle",
] as const;

export type BreedType = (typeof BREED_TYPES)[number];

export const DOG_STATUSES = ["ACTIVE", "RETIRED", "DECEASED", "SOLD"] as const;
export const PUPPY_STATUSES = ["AVAILABLE", "RESERVED", "SOLD", "KEPT"] as const;
export const LITTER_STATUSES = ["PLANNED", "EXPECTING", "BORN", "CLOSED"] as const;
export const RESERVATION_STATUSES = ["OPEN", "COMPLETED", "CANCELLED", "REFUNDED"] as const;
export const PAYMENT_METHODS = ["CASH", "CHECK", "VENMO", "ZELLE", "OTHER"] as const;
export const INQUIRY_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "ARCHIVED"] as const;
export const CONTRACT_STATUSES = ["DRAFT", "SENT", "SIGNED", "CANCELLED"] as const;

export function formatMoney(n: number | null | undefined): string {
  const v = Number(n) || 0;
  return `$${v.toFixed(2)}`;
}

export function customerDisplayName(c: { name: string } | null | undefined, fallback?: string | null) {
  return c?.name || fallback || "—";
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "ACTIVE":
    case "AVAILABLE":
    case "OPEN":
    case "BORN":
    case "QUALIFIED":
    case "SIGNED":
      return "badge-success";
    case "RESERVED":
    case "EXPECTING":
    case "PLANNED":
    case "NEW":
    case "CONTACTED":
    case "SENT":
    case "DRAFT":
      return "badge-warn";
    case "SOLD":
    case "COMPLETED":
    case "CLOSED":
      return "badge-info";
    case "RETIRED":
    case "KEPT":
    case "ARCHIVED":
      return "badge-neutral";
    case "DECEASED":
    case "CANCELLED":
    case "REFUNDED":
      return "badge-danger";
    default:
      return "badge-neutral";
  }
}
