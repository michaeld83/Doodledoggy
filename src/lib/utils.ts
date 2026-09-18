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

export const DOG_STATUSES = ["ACTIVE", "RETIRED", "DECEASED", "SOLD"] as const;
export const PUPPY_STATUSES = ["AVAILABLE", "RESERVED", "SOLD", "KEPT"] as const;
export const LITTER_STATUSES = ["PLANNED", "EXPECTING", "BORN", "CLOSED"] as const;
export const RESERVATION_STATUSES = ["OPEN", "COMPLETED", "CANCELLED", "REFUNDED"] as const;
export const PAYMENT_METHODS = ["CASH", "CHECK", "VENMO", "ZELLE", "OTHER"] as const;

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "ACTIVE":
    case "AVAILABLE":
    case "OPEN":
    case "BORN":
      return "badge-success";
    case "RESERVED":
    case "EXPECTING":
    case "PLANNED":
      return "badge-warn";
    case "SOLD":
    case "COMPLETED":
    case "CLOSED":
      return "badge-info";
    case "RETIRED":
    case "KEPT":
      return "badge-neutral";
    case "DECEASED":
    case "CANCELLED":
    case "REFUNDED":
      return "badge-danger";
    default:
      return "badge-neutral";
  }
}
