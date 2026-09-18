"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PUPPY_STATUSES } from "@/lib/utils";

type Puppy = {
  id: string;
  tempName: string;
  sex: string | null;
  color: string | null;
  status: string;
  pickPosition: number | null;
  notes: string | null;
};

export function PuppyManager({ litterId, puppies }: { litterId: string; puppies: Puppy[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  async function addPuppy(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAdding(true);
    const fd = new FormData(e.currentTarget);
    await fetch("/api/puppies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        litterId,
        tempName: fd.get("tempName"),
        sex: fd.get("sex") || null,
        color: fd.get("color") || null,
        status: fd.get("status") || "AVAILABLE",
        pickPosition: fd.get("pickPosition") ? Number(fd.get("pickPosition")) : null,
      }),
    });
    setAdding(false);
    e.currentTarget.reset();
    router.refresh();
  }

  async function updatePuppy(id: string, patch: Record<string, unknown>) {
    await fetch(`/api/puppies/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    router.refresh();
  }

  async function removePuppy(id: string) {
    if (!confirm("Remove this puppy?")) return;
    await fetch(`/api/puppies/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="table-wrap bg-white">
        <table className="data">
          <thead>
            <tr>
              <th>Temp ID / name</th>
              <th>Sex</th>
              <th>Color</th>
              <th>Pick</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {puppies.map((p) => (
              <tr key={p.id}>
                <td>
                  <input
                    className="input"
                    defaultValue={p.tempName}
                    onBlur={(e) => {
                      if (e.target.value !== p.tempName) updatePuppy(p.id, { tempName: e.target.value });
                    }}
                  />
                </td>
                <td>
                  <select
                    className="input"
                    defaultValue={p.sex || ""}
                    onChange={(e) => updatePuppy(p.id, { sex: e.target.value || null })}
                  >
                    <option value="">—</option>
                    <option value="FEMALE">F</option>
                    <option value="MALE">M</option>
                  </select>
                </td>
                <td>
                  <input
                    className="input"
                    defaultValue={p.color || ""}
                    onBlur={(e) => {
                      if (e.target.value !== (p.color || "")) updatePuppy(p.id, { color: e.target.value });
                    }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="input w-20"
                    defaultValue={p.pickPosition ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value ? Number(e.target.value) : null;
                      if (v !== p.pickPosition) updatePuppy(p.id, { pickPosition: v });
                    }}
                  />
                </td>
                <td>
                  <select
                    className="input"
                    defaultValue={p.status}
                    onChange={(e) => updatePuppy(p.id, { status: e.target.value })}
                  >
                    {PUPPY_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <button type="button" className="btn-ghost text-[var(--danger)]" onClick={() => removePuppy(p.id)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {puppies.length === 0 && (
              <tr><td colSpan={6} className="text-center text-[var(--muted)]">No puppies yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={addPuppy} className="card grid gap-3 sm:grid-cols-5">
        <div>
          <label className="label">Temp name</label>
          <input name="tempName" className="input" required placeholder="Pup D" />
        </div>
        <div>
          <label className="label">Sex</label>
          <select name="sex" className="input" defaultValue="">
            <option value="">—</option>
            <option value="FEMALE">Female</option>
            <option value="MALE">Male</option>
          </select>
        </div>
        <div>
          <label className="label">Color</label>
          <input name="color" className="input" />
        </div>
        <div>
          <label className="label">Pick #</label>
          <input name="pickPosition" type="number" className="input" />
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full" disabled={adding}>
            {adding ? "Adding…" : "Add puppy"}
          </button>
        </div>
      </form>
    </div>
  );
}
