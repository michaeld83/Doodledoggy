"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DocuSignButton({
  reservationId,
  hasBreedType = true,
}: {
  reservationId: string;
  hasBreedType?: boolean;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [templateKey, setTemplateKey] = useState("");

  async function send() {
    if (!hasBreedType && !templateKey) {
      setOk(false);
      setMsg("This litter has no breed type. Pick a contract template (Goldendoodle or Bernedoodle) first.");
      return;
    }
    setLoading(true);
    setMsg("");
    setOk(null);
    try {
      const res = await fetch("/api/docusign/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId, templateKey: templateKey || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      const good = res.ok && Boolean(data.ok);
      setOk(good);
      setMsg(data.message || data.error || (good ? "Done" : `Send failed (HTTP ${res.status})`));
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
      <label className="block text-sm">
        <span className="text-[var(--muted)]">Contract template</span>
        <select
          className="input mt-1"
          value={templateKey}
          onChange={(e) => setTemplateKey(e.target.value)}
        >
          <option value="">{hasBreedType ? "Auto (from litter breed type)" : "Choose template…"}</option>
          <option value="goldendoodle">Goldendoodle</option>
          <option value="bernedoodle">Bernedoodle</option>
        </select>
      </label>
      <button type="button" className="btn-secondary" onClick={send} disabled={loading}>
        {loading ? "Building envelope…" : "Send to DocuSign"}
      </button>
      {msg && (
        <p
          className={`text-sm whitespace-pre-wrap ${ok === false ? "text-red-700" : "text-[var(--brown-soft)]"}`}
        >
          {msg}
        </p>
      )}
    </div>
  );
}
