"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PAYMENT_METHODS, formatMoney } from "@/lib/utils";
import {
  buildFeeLineItems,
  normalizeAddOns,
  sumFeeLines,
  type CustomFeeLine,
  type FeeAddOns,
} from "@/lib/fees";

type LitterOpt = {
  id: string;
  label: string;
  breedType?: string | null;
  puppies: { id: string; tempName: string; status: string }[];
};

type CustomerOpt = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
};

type InitialReservation = {
  id: string;
  litterId: string;
  customerId?: string | null;
  buyerName?: string | null;
  buyerEmail?: string | null;
  buyerPhone?: string | null;
  depositAmount: number;
  paymentMethod?: string | null;
  paidWhere?: string | null;
  paid?: boolean;
  pickPosition?: number | null;
  puppyId?: string | null;
  notes?: string | null;
  snugglePuppy?: boolean;
  snugglePuppyAmount?: number | null;
  travelBag?: boolean;
  travelBagAmount?: number | null;
  travelArrangements?: boolean;
  travelArrangementsNotes?: string | null;
  travelArrangementsAmount?: number | null;
  customFeesJson?: string | null;
};

const emptyAddOns: FeeAddOns = {
  snugglePuppy: false,
  snugglePuppyAmount: 75,
  travelBag: false,
  travelBagAmount: 50,
  travelArrangements: false,
  travelArrangementsNotes: "",
  travelArrangementsAmount: 0,
  customFees: [],
};

export function ReservationForm({
  litters,
  customers: initialCustomers,
  initialLitterId,
  initial,
}: {
  litters: LitterOpt[];
  customers: CustomerOpt[];
  initialLitterId?: string;
  initial?: InitialReservation;
}) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);
  const [litterId, setLitterId] = useState(initial?.litterId || initialLitterId || litters[0]?.id || "");
  const [customers, setCustomers] = useState(initialCustomers);
  const [customerMode, setCustomerMode] = useState<"existing" | "new">(
    initial?.customerId ? "existing" : "new"
  );
  const [customerId, setCustomerId] = useState(initial?.customerId || "");
  const [buyerName, setBuyerName] = useState(initial?.buyerName || "");
  const [buyerEmail, setBuyerEmail] = useState(initial?.buyerEmail || "");
  const [buyerPhone, setBuyerPhone] = useState(initial?.buyerPhone || "");
  const [depositAmount, setDepositAmount] = useState(Number(initial?.depositAmount ?? 500));
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod || "VENMO");
  const [paidWhere, setPaidWhere] = useState(initial?.paidWhere || "");
  const [paid, setPaid] = useState(Boolean(initial?.paid));
  const [pickPosition, setPickPosition] = useState(
    initial?.pickPosition != null ? String(initial.pickPosition) : ""
  );
  const [puppyId, setPuppyId] = useState(initial?.puppyId || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [addOns, setAddOns] = useState<FeeAddOns>(() =>
    initial
      ? normalizeAddOns({
          ...emptyAddOns,
          ...initial,
          customFees: initial.customFeesJson || [],
        })
      : { ...emptyAddOns }
  );
  const [loading, setLoading] = useState(false);
  const [sendingDs, setSendingDs] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const litter = litters.find((l) => l.id === litterId);

  useEffect(() => {
    if (customerMode !== "existing" || !customerId) return;
    const c = customers.find((x) => x.id === customerId);
    if (!c) return;
    setBuyerName(c.name);
    setBuyerEmail(c.email || "");
    setBuyerPhone(c.phone || "");
  }, [customerId, customerMode, customers]);

  const lines = useMemo(
    () => buildFeeLineItems(depositAmount, addOns),
    [depositAmount, addOns]
  );
  const total = useMemo(() => sumFeeLines(lines), [lines]);

  function updateCustomFee(index: number, patch: Partial<CustomFeeLine>) {
    setAddOns((prev) => {
      const customFees = [...prev.customFees];
      customFees[index] = { ...customFees[index], ...patch };
      return { ...prev, customFees };
    });
  }

  function buildPayload() {
    return {
      litterId,
      puppyId: puppyId || null,
      customerId: customerMode === "existing" ? customerId || null : null,
      createCustomer: customerMode === "new",
      createContract: true,
      buyerName,
      buyerEmail: buyerEmail || null,
      buyerPhone: buyerPhone || null,
      depositAmount,
      paymentMethod,
      paidWhere: paidWhere || null,
      paid,
      pickPosition: pickPosition || null,
      notes: notes || null,
      snugglePuppy: addOns.snugglePuppy,
      snugglePuppyAmount: addOns.snugglePuppyAmount,
      travelBag: addOns.travelBag,
      travelBagAmount: addOns.travelBagAmount,
      travelArrangements: addOns.travelArrangements,
      travelArrangementsNotes: addOns.travelArrangementsNotes,
      travelArrangementsAmount: addOns.travelArrangementsAmount,
      customFees: addOns.customFees,
    };
  }

  async function saveReservation(): Promise<string | null> {
    setError("");
    setMessage("");
    if (!buyerName.trim()) {
      setError("Client name is required");
      return null;
    }
    if (customerMode === "existing" && !customerId) {
      setError("Select a customer or create a new one");
      return null;
    }
    const url = isEdit ? `/api/reservations/${initial!.id}` : "/api/reservations";
    const method = isEdit ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload()),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to save");
      return null;
    }
    if (data.customerId && customerMode === "new") {
      setCustomers((prev) =>
        prev.some((c) => c.id === data.customerId)
          ? prev
          : [...prev, { id: data.customerId, name: buyerName, email: buyerEmail, phone: buyerPhone }]
      );
    }
    return data.id as string;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const id = await saveReservation();
    setLoading(false);
    if (!id) return;
    router.push(`/reservations/${id}`);
    router.refresh();
  }

  async function onSaveAndDocuSign() {
    setLoading(true);
    setSendingDs(true);
    const id = await saveReservation();
    if (!id) {
      setLoading(false);
      setSendingDs(false);
      return;
    }
    if (!buyerEmail.trim()) {
      setError("Email required to send DocuSign");
      setLoading(false);
      setSendingDs(false);
      router.push(`/reservations/${id}`);
      return;
    }
    const res = await fetch("/api/docusign/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId: id }),
    });
    const data = await res.json();
    setLoading(false);
    setSendingDs(false);
    if (!res.ok) {
      setError(data.error || "DocuSign failed");
      router.push(`/reservations/${id}`);
      return;
    }
    setMessage(data.message || "DocuSign processed");
    router.push(`/reservations/${id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-5">
      <div>
        <h2 className="font-serif text-lg text-[var(--brown)]">Paid client / reservation</h2>
        <p className="text-sm text-[var(--muted)]">
          Phone-friendly deposit form with add-ons. Save, or send to DocuSign as a customer contract.
        </p>
      </div>

      <fieldset className="space-y-3 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
        <legend className="px-1 text-sm font-semibold text-[var(--brown)]">Customer</legend>
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={customerMode === "existing"}
              onChange={() => setCustomerMode("existing")}
            />
            Existing customer
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={customerMode === "new"}
              onChange={() => setCustomerMode("new")}
            />
            New customer
          </label>
        </div>
        {customerMode === "existing" ? (
          <div>
            <label className="label">Select customer</label>
            <select
              className="input"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
            >
              <option value="">— Choose —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.email ? ` · ${c.email}` : ""}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Name</label>
            <input
              className="input"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={buyerEmail}
              onChange={(e) => setBuyerEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              className="input"
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
              autoComplete="tel"
              inputMode="tel"
            />
          </div>
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Litter</label>
          <select
            className="input"
            value={litterId}
            onChange={(e) => setLitterId(e.target.value)}
            required
          >
            {litters.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
                {l.breedType ? ` (${l.breedType})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Pick position</label>
          <input
            type="number"
            className="input"
            value={pickPosition}
            onChange={(e) => setPickPosition(e.target.value)}
            inputMode="numeric"
          />
        </div>
        <div>
          <label className="label">Puppy (optional)</label>
          <select className="input" value={puppyId} onChange={(e) => setPuppyId(e.target.value)}>
            <option value="">— Unassigned —</option>
            {(litter?.puppies || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.tempName} ({p.status})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Deposit amount ($)</label>
          <input
            type="number"
            step="0.01"
            className="input"
            required
            value={depositAmount}
            onChange={(e) => setDepositAmount(Number(e.target.value))}
            inputMode="decimal"
          />
        </div>
        <div>
          <label className="label">Payment method</label>
          <select
            className="input"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Where paid</label>
          <input
            className="input"
            placeholder="Venmo @MGGA / cash at kennel"
            value={paidWhere}
            onChange={(e) => setPaidWhere(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 pb-2 text-sm font-medium">
            <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
            Mark as paid
          </label>
        </div>
      </div>

      <fieldset className="space-y-3 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
        <legend className="px-1 text-sm font-semibold text-[var(--brown)]">Add-ons / fees</legend>

        <div className="space-y-2 rounded-lg bg-[var(--cream)] p-3">
          <label className="flex flex-wrap items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={addOns.snugglePuppy}
              onChange={(e) => setAddOns((a) => ({ ...a, snugglePuppy: e.target.checked }))}
            />
            Snuggle puppy
          </label>
          {addOns.snugglePuppy && (
            <input
              type="number"
              step="0.01"
              className="input"
              placeholder="Amount $"
              value={addOns.snugglePuppyAmount ?? ""}
              onChange={(e) =>
                setAddOns((a) => ({
                  ...a,
                  snugglePuppyAmount: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
              inputMode="decimal"
            />
          )}
        </div>

        <div className="space-y-2 rounded-lg bg-[var(--cream)] p-3">
          <label className="flex flex-wrap items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={addOns.travelBag}
              onChange={(e) => setAddOns((a) => ({ ...a, travelBag: e.target.checked }))}
            />
            Travel bag
          </label>
          {addOns.travelBag && (
            <input
              type="number"
              step="0.01"
              className="input"
              placeholder="Amount $"
              value={addOns.travelBagAmount ?? ""}
              onChange={(e) =>
                setAddOns((a) => ({
                  ...a,
                  travelBagAmount: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
              inputMode="decimal"
            />
          )}
        </div>

        <div className="space-y-2 rounded-lg bg-[var(--cream)] p-3">
          <label className="flex flex-wrap items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={addOns.travelArrangements}
              onChange={(e) => setAddOns((a) => ({ ...a, travelArrangements: e.target.checked }))}
            />
            Travel arrangements
          </label>
          {addOns.travelArrangements && (
            <>
              <textarea
                className="input"
                rows={2}
                placeholder="Notes (airport, flight nanny, meetup…)"
                value={addOns.travelArrangementsNotes || ""}
                onChange={(e) =>
                  setAddOns((a) => ({ ...a, travelArrangementsNotes: e.target.value }))
                }
              />
              <input
                type="number"
                step="0.01"
                className="input"
                placeholder="Amount $"
                value={addOns.travelArrangementsAmount ?? ""}
                onChange={(e) =>
                  setAddOns((a) => ({
                    ...a,
                    travelArrangementsAmount: e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
                inputMode="decimal"
              />
            </>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Custom fee lines</span>
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() =>
                setAddOns((a) => ({
                  ...a,
                  customFees: [...a.customFees, { label: "", amount: 0 }],
                }))
              }
            >
              + Add line
            </button>
          </div>
          {addOns.customFees.map((fee, i) => (
            <div key={i} className="flex flex-wrap gap-2">
              <input
                className="input min-w-[10rem] flex-1"
                placeholder='Label (e.g. "Flight nanny")'
                value={fee.label}
                onChange={(e) => updateCustomFee(i, { label: e.target.value })}
              />
              <input
                type="number"
                step="0.01"
                className="input w-28"
                placeholder="$"
                value={fee.amount}
                onChange={(e) => updateCustomFee(i, { amount: Number(e.target.value) })}
                inputMode="decimal"
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  setAddOns((a) => ({
                    ...a,
                    customFees: a.customFees.filter((_, idx) => idx !== i),
                  }))
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </fieldset>

      <div className="rounded-xl border bg-white p-3" style={{ borderColor: "var(--border)" }}>
        <h3 className="mb-2 text-sm font-semibold text-[var(--brown)]">Running total</h3>
        <ul className="space-y-1 text-sm">
          {lines.map((l) => (
            <li key={l.key} className="flex justify-between gap-2">
              <span>
                {l.label}
                {l.notes ? <span className="text-[var(--muted)]"> — {l.notes}</span> : null}
              </span>
              <span>{formatMoney(l.amount)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between border-t pt-2 font-semibold" style={{ borderColor: "var(--border)" }}>
          <span>Total</span>
          <span>{formatMoney(total)}</span>
        </div>
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea
          rows={2}
          className="input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      {message && <p className="text-sm text-[var(--brown-soft)]">{message}</p>}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" className="btn-secondary" disabled={loading}>
          {loading && !sendingDs ? "Saving…" : isEdit ? "Save changes" : "Save reservation"}
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={loading}
          onClick={onSaveAndDocuSign}
        >
          {sendingDs ? "Sending to DocuSign…" : "Send to DocuSign"}
        </button>
      </div>
    </form>
  );
}
