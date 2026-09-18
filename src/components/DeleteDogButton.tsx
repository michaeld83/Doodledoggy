"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteDogButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    setBusy(true);
    const res = await fetch(`/api/dogs/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      router.push("/dogs");
      router.refresh();
    } else {
      alert("Delete failed — dog may be linked to litters.");
    }
  }

  return (
    <button type="button" className="btn-danger" onClick={onDelete} disabled={busy}>
      Delete
    </button>
  );
}
