"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Customer = {
  id?: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  notes?: string | null;
};

export function CustomerForm({ customer }: { customer?: Customer }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name"),
      email: fd.get("email") || null,
      phone: fd.get("phone") || null,
      address: fd.get("address") || null,
      street: fd.get("street") || null,
      city: fd.get("city") || null,
      state: fd.get("state") || null,
      zip: fd.get("zip") || null,
      notes: fd.get("notes") || null,
    };
    const url = customer?.id ? `/api/customers/${customer.id}` : "/api/customers";
    const method = customer?.id ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Save failed");
      return;
    }
    router.push(`/customers/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Name</label>
          <input name="name" className="input" required defaultValue={customer?.name || ""} autoComplete="name" />
        </div>
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" className="input" defaultValue={customer?.email || ""} autoComplete="email" inputMode="email" />
        </div>
        <div>
          <label className="label">Telephone</label>
          <input name="phone" className="input" defaultValue={customer?.phone || ""} autoComplete="tel" inputMode="tel" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Address (full)</label>
          <input name="address" className="input" defaultValue={customer?.address || ""} placeholder="Optional free-form address" autoComplete="street-address" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Street</label>
          <input name="street" className="input" defaultValue={customer?.street || ""} />
        </div>
        <div>
          <label className="label">City</label>
          <input name="city" className="input" defaultValue={customer?.city || ""} />
        </div>
        <div>
          <label className="label">State</label>
          <input name="state" className="input" defaultValue={customer?.state || ""} />
        </div>
        <div>
          <label className="label">ZIP</label>
          <input name="zip" className="input" defaultValue={customer?.zip || ""} inputMode="numeric" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Notes</label>
          <textarea name="notes" rows={3} className="input" defaultValue={customer?.notes || ""} />
        </div>
      </div>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Saving…" : "Save customer"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}
