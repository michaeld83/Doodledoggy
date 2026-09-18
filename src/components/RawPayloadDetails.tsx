"use client";

export function RawPayloadDetails({ rawPayload }: { rawPayload: string | null }) {
  if (!rawPayload) {
    return <p className="text-sm text-[var(--muted)]">No raw payload stored.</p>;
  }

  let pretty = rawPayload;
  try {
    pretty = JSON.stringify(JSON.parse(rawPayload), null, 2);
  } catch {
    // leave as-is
  }

  return (
    <details className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
      <summary className="cursor-pointer text-sm font-medium text-[var(--brown)]">
        Raw payload
      </summary>
      <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-[var(--cream-dark)] p-3 text-xs whitespace-pre-wrap break-all">
        {pretty}
      </pre>
    </details>
  );
}
