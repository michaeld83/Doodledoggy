"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DocuSignButton({ reservationId }: { reservationId: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/docusign/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId }),
    });
    const data = await res.json();
    setLoading(false);
    setMsg(data.message || (res.ok ? "Done" : data.error));
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button type="button" className="btn-secondary" onClick={send} disabled={loading}>
        {loading ? "Building envelope…" : "Send to DocuSign"}
      </button>
      {msg && <p className="text-sm text-[var(--brown-soft)] whitespace-pre-wrap">{msg}</p>}
    </div>
  );
}
