"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PAYMENT_METHODS } from "@/lib/utils";

type LitterOpt = { id: string; label: string; puppies: { id: string; tempName: string; status: string }[] };

export function ReservationForm({
  litters,
  initialLitterId,
}: {
  litters: LitterOpt[];
  initialLitterId?: string;
}) {
  const router = useRouter();
  const [litterId, setLitterId] = useState(initialLitterId || litters[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const litter = litters.find((l) => l.id === litterId);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        litterId,
        puppyId: fd.get("puppyId") || null,
        buyerName: fd.get("buyerName"),
        buyerEmail: fd.get("buyerEmail"),
        buyerPhone: fd.get("buyerPhone"),
        depositAmount: fd.get("depositAmount"),
        paymentMethod: fd.get("paymentMethod"),
        paidWhere: fd.get("paidWhere"),
        pickPosition: fd.get("pickPosition") || null,
        notes: fd.get("notes"),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed");
      return;
    }
    router.push(`/reservations/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Litter</label>
          <select className="input" value={litterId} onChange={(e) => setLitterId(e.target.value)} required>
            {litters.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Buyer name</label>
          <input name="buyerName" className="input" required />
        </div>
        <div>
          <label className="label">Buyer email</label>
          <input name="buyerEmail" type="email" className="input" />
        </div>
        <div>
          <label className="label">Buyer phone</label>
          <input name="buyerPhone" className="input" />
        </div>
        <div>
          <label className="label">Deposit amount ($)</label>
          <input name="depositAmount" type="number" step="0.01" className="input" required defaultValue={500} />
        </div>
        <div>
          <label className="label">Payment method</label>
          <select name="paymentMethod" className="input" defaultValue="VENMO">
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Where paid</label>
          <input name="paidWhere" className="input" placeholder="Venmo @MGGA / cash at kennel" />
        </div>
        <div>
          <label className="label">Pick position</label>
          <input name="pickPosition" type="number" className="input" />
        </div>
        <div>
          <label className="label">Puppy (optional)</label>
          <select name="puppyId" className="input" defaultValue="">
            <option value="">— Unassigned —</option>
            {(litter?.puppies || []).map((p) => (
              <option key={p.id} value={p.id}>{p.tempName} ({p.status})</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Notes</label>
          <textarea name="notes" rows={2} className="input" />
        </div>
      </div>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Saving…" : "Save reservation"}</button>
    </form>
  );
}
