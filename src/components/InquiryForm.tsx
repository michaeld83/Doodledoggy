"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InquiryForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        phone: fd.get("phone") || null,
        message: fd.get("message") || null,
        source: "manual",
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not create inquiry");
      return;
    }
    const inquiry = await res.json();
    router.push(`/inquiries/${inquiry.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card max-w-lg space-y-4">
      <div>
        <label className="label" htmlFor="name">Name</label>
        <input id="name" name="name" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="phone">Phone (optional)</label>
        <input id="phone" name="phone" type="tel" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="message">Message</label>
        <textarea id="message" name="message" className="input min-h-[120px]" rows={4} />
      </div>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Saving…" : "Create inquiry"}
      </button>
    </form>
  );
}
