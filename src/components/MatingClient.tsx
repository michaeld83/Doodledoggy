"use client";

import { useState } from "react";
import Link from "next/link";

type DogOpt = { id: string; callName: string; sex: string; registeredName: string };

type Result = {
  checkId: string;
  coiPercent: number;
  highRelatedness: boolean;
  warnCommonWithin: boolean;
  warningMessage: string | null;
  commonAncestors: {
    id: string;
    callName: string;
    registeredName: string;
    contribution: number;
    damGens: number;
    sireGens: number;
  }[];
};

export function MatingClient({
  females,
  males,
  initialDamId,
  initialSireId,
  defaultGens,
}: {
  females: DogOpt[];
  males: DogOpt[];
  initialDamId?: string;
  initialSireId?: string;
  defaultGens: number;
}) {
  const [damId, setDamId] = useState(initialDamId || "");
  const [sireId, setSireId] = useState(initialSireId || "");
  const [gens, setGens] = useState(defaultGens);
  const [result, setResult] = useState<Result | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function runCheck() {
    setLoading(true);
    setError("");
    setConfirmed(false);
    const res = await fetch("/api/coi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ damId, sireId, generations: gens }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "COI check failed");
      return;
    }
    setResult(data);
  }

  async function confirmHigh() {
    if (!result) return;
    const res = await fetch("/api/coi", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkId: result.checkId, confirmed: true }),
    });
    if (res.ok) setConfirmed(true);
  }

  return (
    <div className="space-y-4">
      <div className="card grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label">Proposed dam</label>
          <select className="input" value={damId} onChange={(e) => setDamId(e.target.value)}>
            <option value="">Select…</option>
            {females.map((d) => (
              <option key={d.id} value={d.id}>{d.callName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Proposed sire</label>
          <select className="input" value={sireId} onChange={(e) => setSireId(e.target.value)}>
            <option value="">Select…</option>
            {males.map((d) => (
              <option key={d.id} value={d.id}>{d.callName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Generations</label>
          <select className="input" value={gens} onChange={(e) => setGens(Number(e.target.value))}>
            {[3, 4, 5, 6].map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-3">
          <button type="button" className="btn-primary" disabled={!damId || !sireId || loading} onClick={runCheck}>
            {loading ? "Calculating…" : "Calculate Wright's COI"}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      {result && (
        <div className={`card ${result.highRelatedness ? "border-[var(--warn)] ring-2 ring-[var(--gold-soft)]" : ""}`}>
          <h2 className="font-serif text-xl text-[var(--brown)]">
            COI: {result.coiPercent.toFixed(2)}%
          </h2>
          {result.highRelatedness ? (
            <div className="mt-3 rounded-lg bg-[#faf0d4] p-3 text-sm">
              <p className="font-semibold text-[var(--warn)]">⚠ High relatedness warning</p>
              <p className="mt-1">{result.warningMessage}</p>
              {!confirmed ? (
                <button type="button" className="btn-danger mt-3" onClick={confirmHigh}>
                  I understand — confirm this pairing
                </button>
              ) : (
                <p className="mt-2 font-medium text-[var(--success)]">Confirmed and logged. You may proceed to create a litter.</p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--success)]">Relatedness within configured thresholds.</p>
          )}

          <h3 className="mt-4 font-semibold text-[var(--brown)]">Common ancestors</h3>
          {result.commonAncestors.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">None found within {gens} generations.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {result.commonAncestors.map((a) => (
                <li key={a.id} className="rounded-lg border p-2 text-sm" style={{ borderColor: "var(--border)" }}>
                  <Link href={`/dogs/${a.id}`} className="font-medium hover:underline">{a.callName}</Link>
                  <span className="text-[var(--muted)]"> — {a.registeredName}</span>
                  <div className="text-xs text-[var(--muted)]">
                    Contribution {(a.contribution * 100).toFixed(3)}% · paths dam {a.damGens}g / sire {a.sireGens}g
                  </div>
                </li>
              ))}
            </ul>
          )}

          {(confirmed || !result.highRelatedness) && damId && sireId && (
            <Link
              href={`/litters/new`}
              className="btn-secondary mt-4 inline-flex"
            >
              Create litter with this pair (select dam/sire on form)
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
