"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LITTER_STATUSES } from "@/lib/utils";

type DogOpt = { id: string; callName: string; sex: string };

type CoiPreview = {
  coiPercent: number;
  highRelatedness: boolean;
  warningMessage: string | null;
  commonAncestors: { callName: string; contribution: number; damGens: number; sireGens: number }[];
};

export function LitterForm({
  females,
  males,
}: {
  females: DogOpt[];
  males: DogOpt[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [coi, setCoi] = useState<CoiPreview | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(confirmed: boolean, form: HTMLFormElement) {
    setLoading(true);
    setError("");
    const fd = new FormData(form);
    const body = {
      name: fd.get("name"),
      damId: fd.get("damId"),
      sireId: fd.get("sireId"),
      whelpDate: fd.get("whelpDate") || null,
      expectedDate: fd.get("expectedDate") || null,
      notes: fd.get("notes"),
      status: fd.get("status"),
      confirmed,
    };
    const res = await fetch("/api/litters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (res.status === 409 && data.error === "HIGH_RELATEDNESS") {
      setCoi(data.coi);
      setNeedsConfirm(true);
      setError(data.message);
      return;
    }
    if (!res.ok) {
      setError(data.error || "Failed to create litter");
      return;
    }
    router.push(`/litters/${data.id}`);
    router.refresh();
  }

  return (
    <form
      className="card space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit(false, e.currentTarget);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Litter name</label>
          <input name="name" className="input" placeholder="e.g. Honey × Cedar — Summer 2026" />
        </div>
        <div>
          <label className="label">Dam</label>
          <select name="damId" className="input" required defaultValue="">
            <option value="" disabled>Select dam</option>
            {females.map((d) => (
              <option key={d.id} value={d.id}>{d.callName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Sire</label>
          <select name="sireId" className="input" required defaultValue="">
            <option value="" disabled>Select sire</option>
            {males.map((d) => (
              <option key={d.id} value={d.id}>{d.callName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Expected date</label>
          <input name="expectedDate" type="date" className="input" />
        </div>
        <div>
          <label className="label">Whelp date</label>
          <input name="whelpDate" type="date" className="input" />
        </div>
        <div>
          <label className="label">Status</label>
          <select name="status" className="input" defaultValue="PLANNED">
            {LITTER_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Notes</label>
          <textarea name="notes" rows={3} className="input" />
        </div>
      </div>

      {coi && (
        <div className={`rounded-lg border p-3 text-sm ${coi.highRelatedness ? "border-[var(--warn)] bg-[#faf0d4]" : "border-[var(--border)] bg-[var(--cream)]"}`}>
          <p className="font-semibold">Wright&apos;s COI: {coi.coiPercent.toFixed(2)}%</p>
          {coi.warningMessage && <p className="mt-1">{coi.warningMessage}</p>}
          {coi.commonAncestors?.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs">
              {coi.commonAncestors.slice(0, 5).map((a, i) => (
                <li key={i}>
                  {a.callName} — {(a.contribution * 100).toFixed(2)}% (dam {a.damGens}g / sire {a.sireGens}g)
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      {!needsConfirm ? (
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Checking COI…" : "Create litter"}
        </button>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-danger"
            disabled={loading}
            onClick={(e) => {
              const form = (e.currentTarget as HTMLButtonElement).closest("form");
              if (form) submit(true, form);
            }}
          >
            Confirm high relatedness & create
          </button>
          <button type="button" className="btn-secondary" onClick={() => { setNeedsConfirm(false); setError(""); }}>
            Cancel
          </button>
        </div>
      )}
      <p className="text-xs text-[var(--muted)]">
        High COI or common ancestors within the configured generation window always require explicit confirmation — never silently allowed.
      </p>
    </form>
  );
}
