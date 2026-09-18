"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { INQUIRY_STATUSES } from "@/lib/inquiry";

export function InquiryStatusControl({
  inquiryId,
  currentStatus,
}: {
  inquiryId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function save(next: string) {
    setStatus(next);
    setLoading(true);
    setMsg("");
    const res = await fetch(`/api/inquiries/${inquiryId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMsg(data.error || "Update failed");
      setStatus(currentStatus);
      return;
    }
    setMsg("Saved");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <label className="label" htmlFor="inquiry-status">Status</label>
      <select
        id="inquiry-status"
        className="input"
        value={status}
        disabled={loading}
        onChange={(e) => save(e.target.value)}
      >
        {INQUIRY_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      {msg && <p className="text-xs text-[var(--muted)]">{msg}</p>}
    </div>
  );
}
