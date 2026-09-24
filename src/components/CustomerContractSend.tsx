"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PAYMENT_METHODS, formatMoney } from "@/lib/utils";

export type ContractPrefill = {
  customerId: string;
  preferredTemplateKey?: string | null;
  buyerName: string;
  buyerEmail: string;
  litter?: string;
  puppy?: string;
  place?: string;
  depositMethod?: string;
  depositAmount?: number | null;
  paymentsTotal?: number;
  reservationId?: string | null;
  lastContract?: {
    id: string;
    title: string;
    docusignStatus: string | null;
    docusignTemplateKey: string | null;
    envelopeId: string | null;
  } | null;
};

const TEMPLATES = [
  { key: "goldendoodle", label: "Goldendoodle" },
  { key: "bernedoodle", label: "Bernedoodle" },
] as const;

function depositPrefillString(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  if (!Number.isFinite(v)) return "";
  // show empty for 0 so staff can leave blank; still allow 0 if they type it
  if (v === 0) return "";
  return String(v);
}

export function CustomerContractSend({ prefill }: { prefill: ContractPrefill }) {
  const router = useRouter();
  const initialKey =
    prefill.preferredTemplateKey === "bernedoodle" ||
    prefill.preferredTemplateKey === "goldendoodle"
      ? prefill.preferredTemplateKey
      : "goldendoodle";

  const [templateKey, setTemplateKey] = useState<string>(initialKey);
  const [buyerName, setBuyerName] = useState(prefill.buyerName || "");
  const [buyerEmail, setBuyerEmail] = useState(prefill.buyerEmail || "");
  const [litter, setLitter] = useState(prefill.litter || "");
  const [puppy, setPuppy] = useState(prefill.puppy || "");
  const [price, setPrice] = useState("TBD");
  const [depositAmount, setDepositAmount] = useState(
    depositPrefillString(prefill.depositAmount)
  );
  const [place, setPlace] = useState(prefill.place || "");
  const [depositMethod, setDepositMethod] = useState(
    prefill.depositMethod || ""
  );
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState<boolean | null>(null);

  const canSend = useMemo(
    () => Boolean(buyerName.trim() && buyerEmail.trim() && templateKey),
    [buyerName, buyerEmail, templateKey]
  );

  async function send() {
    if (!canSend) {
      setOk(false);
      setMsg("Buyer name, email, and template are required.");
      return;
    }
    setLoading(true);
    setMsg("");
    setOk(null);
    try {
      const depositParsed =
        depositAmount.trim() === ""
          ? 0
          : Number(depositAmount.replace(/[$,]/g, ""));
      const res = await fetch("/api/docusign/send-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: prefill.customerId,
          templateKey,
          reservationId: prefill.reservationId || undefined,
          fields: {
            buyerName: buyerName.trim(),
            buyerEmail: buyerEmail.trim(),
            litter: litter.trim() || null,
            puppy: puppy.trim() || null,
            price: price.trim() || "TBD",
            depositAmount: Number.isFinite(depositParsed) ? depositParsed : 0,
            place: place.trim() || null,
            depositMethod: depositMethod.trim() || null,
          },
        }),
      });
      const data = await res.json();
      setOk(Boolean(data.ok));
      setMsg(
        data.message ||
          data.error ||
          (res.ok ? "Sent" : "Send failed")
      );
      router.refresh();
    } catch (e) {
      setOk(false);
      setMsg(e instanceof Error ? e.message : "Send failed");
    } finally {
      setLoading(false);
    }
  }

  const paymentsHint =
    typeof prefill.paymentsTotal === "number" && prefill.paymentsTotal > 0
      ? `Payments already recorded: ${formatMoney(prefill.paymentsTotal)}`
      : null;

  return (
    <section className="card space-y-4">
      <div>
        <h2 className="font-serif text-lg text-[var(--brown)]">Send contract</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Staff fill name, email, litter, puppy, price, deposit amount, place
          paid, and deposit method. Buyer address/phone are filled by the
          purchaser when signing (prefilled from customer record only when
          already on file).
        </p>
        {paymentsHint && (
          <p className="mt-1 text-xs text-[var(--brown-soft)]">{paymentsHint}</p>
        )}
      </div>

      {prefill.lastContract && (
        <p className="text-sm text-[var(--brown-soft)]">
          Last: {prefill.lastContract.title}
          {prefill.lastContract.docusignStatus
            ? ` · DocuSign ${prefill.lastContract.docusignStatus}`
            : ""}
          {prefill.lastContract.docusignTemplateKey
            ? ` · ${prefill.lastContract.docusignTemplateKey}`
            : ""}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Template</label>
          <select
            className="input"
            value={templateKey}
            onChange={(e) => setTemplateKey(e.target.value)}
          >
            {TEMPLATES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Buyer name</label>
          <input
            className="input"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            autoComplete="name"
            required
          />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            required
          />
        </div>
        <div>
          <label className="label">Litter</label>
          <input
            className="input"
            value={litter}
            onChange={(e) => setLitter(e.target.value)}
            placeholder="Litter name"
          />
        </div>
        <div>
          <label className="label">Puppy</label>
          <input
            className="input"
            value={puppy}
            onChange={(e) => setPuppy(e.target.value)}
            placeholder="Puppy name"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Price</label>
          <input
            className="input"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="TBD"
          />
          <p className="mt-1 text-xs text-[var(--muted)]">
            Defaults to TBD — looks determine price; override with an amount when known.
          </p>
        </div>
        <div>
          <label className="label">Deposit amount</label>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="0"
          />
          <p className="mt-1 text-xs text-[var(--muted)]">
            Dollars for the deposit (not the puppy price above). Prefills from
            latest reservation when available.
          </p>
        </div>
        <div>
          <label className="label">Deposit method</label>
          <select
            className="input"
            value={depositMethod}
            onChange={(e) => setDepositMethod(e.target.value)}
          >
            <option value="">— Select —</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Place paid / where paid</label>
          <input
            className="input"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="e.g. farm visit, Zelle"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-primary"
          onClick={send}
          disabled={loading || !canSend}
        >
          {loading ? "Sending…" : "Send contract"}
        </button>
      </div>
      {msg && (
        <p
          className={`text-sm whitespace-pre-wrap ${
            ok === false ? "text-[var(--danger)]" : "text-[var(--brown-soft)]"
          }`}
        >
          {msg}
        </p>
      )}
    </section>
  );
}
