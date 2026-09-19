"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PUPPY_STATUSES } from "@/lib/utils";

type CustomerOption = { id: string; name: string; phone: string | null };

type PuppyData = {
  id: string;
  litterId: string;
  tempName: string;
  callName: string | null;
  sex: string | null;
  color: string | null;
  status: string;
  pickPosition: number | null;
  notes: string | null;
  customerId: string | null;
  wantsSnugglePuppy: boolean;
  wantsTravelDocuments: boolean;
};

export function PuppyDetailEditor({
  puppy,
  customers,
  pickerFallback,
}: {
  puppy: PuppyData;
  customers: CustomerOption[];
  pickerFallback: { name: string | null; phone: string | null };
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    tempName: puppy.tempName,
    callName: puppy.callName || "",
    sex: puppy.sex || "",
    color: puppy.color || "",
    status: puppy.status,
    pickPosition: puppy.pickPosition?.toString() ?? "",
    customerId: puppy.customerId || "",
    wantsSnugglePuppy: puppy.wantsSnugglePuppy,
    wantsTravelDocuments: puppy.wantsTravelDocuments,
    notes: puppy.notes || "",
  });

  const selectedCustomer = customers.find((c) => c.id === form.customerId);
  const displayPhone = selectedCustomer?.phone || pickerFallback.phone;
  const displayName = selectedCustomer?.name || pickerFallback.name;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/puppies/${puppy.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tempName: form.tempName,
        callName: form.callName || null,
        sex: form.sex || null,
        color: form.color || null,
        status: form.status,
        pickPosition: form.pickPosition === "" ? null : Number(form.pickPosition),
        customerId: form.customerId || null,
        wantsSnugglePuppy: form.wantsSnugglePuppy,
        wantsTravelDocuments: form.wantsTravelDocuments,
        notes: form.notes || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setMessage("Save failed");
      return;
    }
    setMessage("Saved");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="card grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Original name</label>
          <input
            className="input"
            value={form.tempName}
            onChange={(e) => setForm((f) => ({ ...f, tempName: e.target.value }))}
            required
          />
          <p className="mt-1 text-xs text-[var(--muted)]">Temp / litter ID name</p>
        </div>
        <div>
          <label className="label">Call / new name</label>
          <input
            className="input"
            value={form.callName}
            onChange={(e) => setForm((f) => ({ ...f, callName: e.target.value }))}
            placeholder="Name we start calling them"
          />
        </div>
        <div>
          <label className="label">Sex</label>
          <select
            className="input"
            value={form.sex}
            onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value }))}
          >
            <option value="">—</option>
            <option value="FEMALE">Female</option>
            <option value="MALE">Male</option>
          </select>
        </div>
        <div>
          <label className="label">Color</label>
          <input
            className="input"
            value={form.color}
            onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Pick #</label>
          <input
            type="number"
            className="input"
            value={form.pickPosition}
            onChange={(e) => setForm((f) => ({ ...f, pickPosition: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Status</label>
          <select
            className="input"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          >
            {PUPPY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="font-serif text-lg text-[var(--brown)]">Picker</h2>
        <div>
          <label className="label">Customer (manual override)</label>
          <select
            className="input"
            value={form.customerId}
            onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
          >
            <option value="">— None / from reservation —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.phone ? ` · ${c.phone}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="rounded-lg bg-[var(--cream-dark)] p-3 text-sm">
          <div>
            <span className="text-[var(--muted)]">Name: </span>
            <strong>{displayName || "—"}</strong>
          </div>
          <div className="mt-1">
            <span className="text-[var(--muted)]">Phone: </span>
            {displayPhone ? (
              <a href={`tel:${displayPhone}`} className="font-medium text-[var(--gold-dark)]">
                {displayPhone}
              </a>
            ) : (
              "—"
            )}
          </div>
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="font-serif text-lg text-[var(--brown)]">Add-ons</h2>
        <label className="flex min-h-[44px] items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={form.wantsSnugglePuppy}
            onChange={(e) => setForm((f) => ({ ...f, wantsSnugglePuppy: e.target.checked }))}
          />
          Wants snuggle puppy
        </label>
        <label className="flex min-h-[44px] items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={form.wantsTravelDocuments}
            onChange={(e) =>
              setForm((f) => ({ ...f, wantsTravelDocuments: e.target.checked }))
            }
          />
          Wants travel documents
        </label>
        <p className="text-xs text-[var(--muted)]">
          Travel documents sync from reservation travel bag / travel arrangements when a
          puppy is linked.
        </p>
      </div>

      <div className="card">
        <label className="label">Notes</label>
        <textarea
          className="input min-h-[120px]"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Puppy notes…"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary min-h-[44px] px-6" disabled={saving}>
          {saving ? "Saving…" : "Save puppy"}
        </button>
        {message && <span className="text-sm text-[var(--muted)]">{message}</span>}
      </div>
    </form>
  );
}
