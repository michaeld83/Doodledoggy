import { statusBadgeClass } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  return <span className={statusBadgeClass(status)}>{status.replace(/_/g, " ")}</span>;
}
