"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteCustomerButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (
      !confirm(
        `Delete client "${name}"? Their contracts will be removed. Reservations stay but unlink from this client. This cannot be undone.`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Delete failed");
        return;
      }
      router.push("/customers");
      router.refresh();
    } catch {
      alert("Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="btn-danger" onClick={onDelete} disabled={busy}>
      {busy ? "Deleting…" : "Delete client"}
    </button>
  );
}
