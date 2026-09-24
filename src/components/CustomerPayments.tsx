"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PAYMENT_METHODS, formatDate, formatMoney, toInputDate } from "@/lib/utils";

export type PaymentRow = {
  id: string;
  amount: number;
  method: string | null;
  paidWhere: string | null;
  paidAt: string | Date;
  notes: string | null;
  contractId: string | null;
  contractTitle: string | null;
};

export type ContractOption = {
  id: string;
  title: string;
  depositAmount: number;
};

export function CustomerPayments({
  customerId,
  payments,
  contracts,
  latestDeposit,
}: {
  customerId: string;
  payments: PaymentRow[];
  contracts: ContractOption[];
  latestDeposit?: number | null;
}) {
  const router = useRouter();
  const today = toInputDate(new Date());
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [paidWhere, setPaidWhere] = useState("");
  const [paidAt, setPaidAt] = useState(today);
  const [notes, setNotes] = useState("");
  const [contractId, setContractId] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState<boolean | null>(null);

  const totalPaid = useMemo(
    () => payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [payments]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount.replace(/[$,]/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      setOk(false);
      setMsg("Enter a positive amount.");
      return;
    }
    setBusy(true);
    setMsg("");
    setOk(null);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          amount: n,
          method: method || null,
          paidWhere: paidWhere.trim() || null,
          paidAt: paidAt || undefined,
          notes: notes.trim() || null,
          contractId: contractId || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setOk(false);
        setMsg(data.error || "Could not save payment");
        return;
      }
      setAmount("");
      setMethod("");
      setPaidWhere("");
      setPaidAt(today);
      setNotes("");
      setContractId("");
      setOk(true);
      setMsg("Payment recorded");
      router.refresh();
    } catch {
      setOk(false);
      setMsg("Could not save payment");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Remove this payment? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/payments/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Delete failed");
        return;
      }
      router.refresh();
    } catch {
      alert("Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="font-serif text-lg text-[var(--brown)]">Payments</h2>
        <div className="text-sm text-[var(--brown-soft)]">
          Total paid: <span className="font-medium">{formatMoney(totalPaid)}</span>
          {typeof latestDeposit === "number" && latestDeposit > 0 && (
            <span className="ml-2 text-[var(--muted)]">
              · Deposit on contract: {formatMoney(latestDeposit)}
            </span>
          )}
        </div>
      </div>

      {payments.length === 0 && (
        <p className="text-sm text-[var(--muted)]">No payments recorded yet</p>
      )}

      <div className="grid gap-3">
        {payments.map((p) => (
          <div key={p.id} className="card space-y-1 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-medium">{formatMoney(p.amount)}</div>
                <div className="text-xs text-[var(--muted)]">
                  {formatDate(p.paidAt)}
                  {p.method ? ` · ${p.method}` : ""}
                  {p.paidWhere ? ` · ${p.paidWhere}` : ""}
                </div>
                {p.contractTitle && (
                  <div className="mt-1 text-xs text-[var(--brown-soft)]">
                    Contract: {p.contractTitle}
                  </div>
                )}
                {p.notes && <p className="mt-1 text-[var(--muted)]">{p.notes}</p>}
              </div>
              <button
                type="button"
                className="btn-danger text-xs"
                onClick={() => onDelete(p.id)}
                disabled={deletingId === p.id}
              >
                {deletingId === p.id ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="card space-y-3">
        <h3 className="font-medium text-[var(--brown)]">Record payment</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Amount *</label>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="label">Method</label>
            <select
              className="input"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="">— Select —</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Place paid</label>
            <input
              className="input"
              value={paidWhere}
              onChange={(e) => setPaidWhere(e.target.value)}
              placeholder="e.g. farm, Venmo"
            />
          </div>
          <div>
            <label className="label">Date</label>
            <input
              className="input"
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
            />
          </div>
          {contracts.length > 0 && (
            <div className="sm:col-span-2">
              <label className="label">Link to contract (optional)</label>
              <select
                className="input"
                value={contractId}
                onChange={(e) => setContractId(e.target.value)}
              >
                <option value="">— None —</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="label">Notes</label>
            <input
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Saving…" : "Add payment"}
        </button>
        {msg && (
          <p
            className={`text-sm ${
              ok === false ? "text-[var(--danger)]" : "text-[var(--brown-soft)]"
            }`}
          >
            {msg}
          </p>
        )}
      </form>
    </section>
  );
}
