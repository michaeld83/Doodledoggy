"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type ContractPrefill = {
  customerId: string;
  preferredTemplateKey?: string | null;
  buyerName: string;
  buyerEmail: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
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
  const [street, setStreet] = useState(prefill.street || "");
  const [city, setCity] = useState(prefill.city || "");
  const [state, setState] = useState(prefill.state || "");
  const [zip, setZip] = useState(prefill.zip || "");
  const [phone, setPhone] = useState(prefill.phone || "");
  const [price, setPrice] = useState("TBD");
  const [notes, setNotes] = useState("");
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
      const res = await fetch("/api/docusign/send-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: prefill.customerId,
          templateKey,
          fields: {
            buyerName: buyerName.trim(),
            buyerEmail: buyerEmail.trim(),
            street: street.trim(),
            city: city.trim(),
            state: state.trim(),
            zip: zip.trim(),
            phone: phone.trim(),
            price: (price.trim() || "TBD"),
            notes: notes.trim() || null,
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

  return (
    <section className="card space-y-4">
      <div>
        <h2 className="font-serif text-lg text-[var(--brown)]">Send contract</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Pick a DocuSign template and confirm purchaser details. Name, email, address, and phone fill DocuSign tabs; puppy price is stored on the contract and email blurb (default TBD).
        </p>
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
          <label className="label">Purchaser name</label>
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
        <div className="sm:col-span-2">
          <label className="label">Street</label>
          <input
            className="input"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            autoComplete="street-address"
          />
        </div>
        <div>
          <label className="label">City</label>
          <input
            className="input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            autoComplete="address-level2"
          />
        </div>
        <div>
          <label className="label">State</label>
          <input
            className="input"
            value={state}
            onChange={(e) => setState(e.target.value)}
            autoComplete="address-level1"
          />
        </div>
        <div>
          <label className="label">ZIP</label>
          <input
            className="input"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            inputMode="numeric"
            autoComplete="postal-code"
          />
        </div>
        <div>
          <label className="label">Phone</label>
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            autoComplete="tel"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Puppy price</label>
          <input
            className="input"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="TBD"
          />
          <p className="mt-1 text-xs text-[var(--muted)]">
            Defaults to TBD — override with a dollar amount when known (stored on contract / email blurb).
          </p>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Notes (in-app only)</label>
          <textarea
            className="input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Not sent into DocuSign fields"
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
