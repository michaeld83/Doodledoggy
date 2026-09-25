import type { EsignConnection } from "@/lib/esign/types";

/** Plain notice when the e-sign provider isn't connected (or a template is missing). */
export function EsignNotice({ esign, reason }: { esign: EsignConnection; reason?: string }) {
  const text = reason || esign.message;
  if (esign.connected && !reason && esign.templates.goldendoodle && esign.templates.bernedoodle) return null;
  return (
    <div
      role="status"
      className="rounded-lg border px-3 py-2 text-sm"
      style={{ borderColor: "var(--border)", background: "var(--cream-dark)" }}
    >
      <strong className="text-[var(--brown)]">
        {esign.connected ? `${esign.label}: setup incomplete` : `${esign.label} not connected`}
      </strong>
      <p className="mt-1 text-[var(--brown-soft)]">{text}</p>
      {esign.missing.length > 0 && (
        <p className="mt-1 text-xs text-[var(--muted)]">Missing: {esign.missing.join(", ")}</p>
      )}
    </div>
  );
}
