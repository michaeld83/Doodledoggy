"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PUPPY_STATUSES } from "@/lib/utils";
import { puppyDisplayName, resolvePicker } from "@/lib/puppy";

type Puppy = {
  id: string;
  tempName: string;
  callName: string | null;
  sex: string | null;
  color: string | null;
  status: string;
  pickPosition: number | null;
  notes: string | null;
  wantsSnugglePuppy: boolean;
  wantsTravelDocuments: boolean;
  customerId: string | null;
  customer?: { id: string; name: string; phone: string | null } | null;
  reservation?: {
    buyerName: string | null;
    buyerPhone: string | null;
    customer?: { id: string; name: string; phone: string | null } | null;
  } | null;
};

function Check({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
        on
          ? "bg-[var(--cream-dark)] text-[var(--brown)]"
          : "text-[var(--muted)] opacity-40"
      }`}
      title={label}
    >
      {on ? "✓" : "·"} {label}
    </span>
  );
}

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
        callName: fd.get("callName") || null,
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
      {/* Mobile-friendly cards */}
      <div className="space-y-3 sm:hidden">
        {puppies.map((p) => {
          const picker = resolvePicker(p);
          return (
            <Link
              key={p.id}
              href={`/puppies/${p.id}`}
              className="card block active:scale-[0.99] transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-[var(--brown)]">{puppyDisplayName(p)}</div>
                  {p.callName && p.callName !== p.tempName && (
                    <div className="text-xs text-[var(--muted)]">orig. {p.tempName}</div>
                  )}
                </div>
                <span className="text-xs text-[var(--muted)]">{p.status}</span>
              </div>
              <div className="mt-2 text-sm">
                {picker.name ? (
                  <span>
                    Picker: <strong>{picker.name}</strong>
                  </span>
                ) : (
                  <span className="text-[var(--muted)]">No picker yet</span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <Check on={p.wantsSnugglePuppy} label="Snuggle" />
                <Check on={p.wantsTravelDocuments} label="Travel docs" />
                {p.pickPosition != null && (
                  <span className="text-xs text-[var(--muted)]">Pick #{p.pickPosition}</span>
                )}
              </div>
            </Link>
          );
        })}
        {puppies.length === 0 && (
          <div className="card text-center text-[var(--muted)]">No puppies yet</div>
        )}
      </div>

      <div className="table-wrap hidden bg-white sm:block">
        <table className="data">
          <thead>
            <tr>
              <th>Name</th>
              <th>Picker</th>
              <th>Add-ons</th>
              <th>Sex</th>
              <th>Pick</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {puppies.map((p) => {
              const picker = resolvePicker(p);
              return (
                <tr key={p.id} className="align-top">
                  <td>
                    <Link
                      href={`/puppies/${p.id}`}
                      className="font-medium text-[var(--gold-dark)] hover:underline"
                    >
                      {puppyDisplayName(p)}
                    </Link>
                    <div className="mt-1 text-xs text-[var(--muted)]">
                      Original:{" "}
                      <input
                        className="input inline-block w-28 py-0.5 text-xs"
                        defaultValue={p.tempName}
                        onBlur={(e) => {
                          if (e.target.value !== p.tempName) {
                            updatePuppy(p.id, { tempName: e.target.value });
                          }
                        }}
                        onClick={(e) => e.preventDefault()}
                      />
                    </div>
                    <div className="mt-1 text-xs text-[var(--muted)]">
                      Call:{" "}
                      <input
                        className="input inline-block w-28 py-0.5 text-xs"
                        defaultValue={p.callName || ""}
                        placeholder="new name"
                        onBlur={(e) => {
                          const v = e.target.value || null;
                          if (v !== (p.callName || null)) {
                            updatePuppy(p.id, { callName: v });
                          }
                        }}
                      />
                    </div>
                  </td>
                  <td>
                    {picker.name ? (
                      <div>
                        <div className="font-medium">{picker.name}</div>
                        {picker.phone && (
                          <a href={`tel:${picker.phone}`} className="text-xs text-[var(--gold-dark)]">
                            {picker.phone}
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-[var(--muted)]">—</span>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <Check on={p.wantsSnugglePuppy} label="Snuggle" />
                      <Check on={p.wantsTravelDocuments} label="Travel docs" />
                    </div>
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
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="space-y-1">
                    <Link href={`/puppies/${p.id}`} className="btn-ghost block text-sm">
                      Details
                    </Link>
                    <button
                      type="button"
                      className="btn-ghost text-[var(--danger)]"
                      onClick={() => removePuppy(p.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
            {puppies.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-[var(--muted)]">
                  No puppies yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={addPuppy} className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div>
          <label className="label">Original name</label>
          <input name="tempName" className="input" required placeholder="Pup D" />
        </div>
        <div>
          <label className="label">Call / new name</label>
          <input name="callName" className="input" placeholder="Optional" />
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
