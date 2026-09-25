"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Refresh SignWell status / download completed PDF for a stored document id. */
export function EsignDocumentActions({ documentId, connected }: { documentId: string; connected: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`/api/esign/documents/${encodeURIComponent(documentId)}`);
      const data = await res.json().catch(() => ({}));
      setMsg(res.ok ? `Status: ${data.status}` : data.error || `Failed (HTTP ${res.status})`);
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!connected) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <button type="button" className="btn-secondary" onClick={refresh} disabled={loading}>
        {loading ? "Checking…" : "Refresh status"}
      </button>
      <a className="btn-secondary" href={`/api/esign/documents/${encodeURIComponent(documentId)}/pdf`}>
        Download signed PDF
      </a>
      {msg && <span className="text-[var(--brown-soft)]">{msg}</span>}
    </div>
  );
}
