"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EsignConnection } from "@/lib/esign/types";
import { canSendTemplate } from "@/lib/esign/types";
import { EsignNotice } from "@/components/EsignNotice";

/** Reservation "Send contract" via the active e-sign provider (SignWell by default). */
export function ContractSendButton({
  reservationId,
  hasBreedType = true,
  esign,
}: {
  reservationId: string;
  hasBreedType?: boolean;
  esign: EsignConnection;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [templateKey, setTemplateKey] = useState("");

  const gate = canSendTemplate(esign, templateKey || null);
  const disabled = loading || !gate.ok;

  async function send() {
    if (!gate.ok) return;
    if (!hasBreedType && !templateKey) {
      setOk(false);
      setMsg("This litter has no breed type. Pick a contract template (Goldendoodle or Bernedoodle) first.");
      return;
    }
    setLoading(true);
    setMsg("");
    setOk(null);
    try {
      const res = await fetch(esign.sendReservationEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId, templateKey: templateKey || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      const good = res.ok && Boolean(data.ok);
      setOk(good);
      setMsg(data.message || data.error || (good ? "Sent" : `Send failed (HTTP ${res.status})`));
      if (good) router.refresh();
    } catch (e) {
      setOk(false);
      setMsg(e instanceof Error ? e.message : "Send failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {!gate.ok && <EsignNotice esign={esign} reason={gate.reason} />}
      <label className="block text-sm">
        <span className="text-[var(--muted)]">Contract template</span>
        <select className="input mt-1" value={templateKey} onChange={(e) => setTemplateKey(e.target.value)}>
          <option value="">{hasBreedType ? "Auto (from litter breed type)" : "Choose template…"}</option>
          <option value="goldendoodle">Goldendoodle</option>
          <option value="bernedoodle">Bernedoodle</option>
        </select>
      </label>
      <button
        type="button"
        className="btn-secondary"
        onClick={send}
        disabled={disabled}
        title={!gate.ok ? gate.reason : undefined}
      >
        {loading ? "Sending…" : `Send contract (${esign.label})`}
      </button>
      {msg && (
        <p className={`text-sm whitespace-pre-wrap ${ok === false ? "text-[var(--danger)]" : "text-[var(--brown-soft)]"}`}>
          {msg}
        </p>
      )}
    </div>
  );
}
