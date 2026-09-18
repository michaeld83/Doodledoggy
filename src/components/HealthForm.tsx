"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function HealthForm({ dogId }: { dogId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    form.set("dogId", dogId);
    const res = await fetch("/api/health", { method: "POST", body: form });
    setLoading(false);
    if (!res.ok) {
      setError("Failed to add health record");
      return;
    }
    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" encType="multipart/form-data">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Title</label>
          <input name="title" className="input" required placeholder="e.g. Annual vaccines" />
        </div>
        <div>
          <label className="label">Record date</label>
          <input name="recordDate" type="date" className="input" />
        </div>
        <div>
          <label className="label">Follow-up date</label>
          <input name="followUpAt" type="date" className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Notes</label>
          <textarea name="notes" rows={2} className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">File upload</label>
          <input name="file" type="file" className="input" />
        </div>
      </div>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Saving…" : "Add health record"}</button>
    </form>
  );
}
