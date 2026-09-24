import { getDocuSignConfig, isDocuSignConfigured, docusignSetupGuide } from "@/lib/docusign";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const cfg = getDocuSignConfig();
  const settings = await prisma.appSetting.findMany();
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="text-sm text-[var(--muted)]">Kennel config, COI thresholds, DocuSign</p>
      </div>

      <section className="card">
        <h2 className="mb-3 font-serif text-lg text-[var(--brown)]">COI / relatedness</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-lg bg-[var(--cream)] p-3">
            <div className="text-xs uppercase text-[var(--muted)]">Warn threshold (%)</div>
            <div className="text-xl font-semibold">{process.env.COI_WARN_THRESHOLD || map.coi_warn_threshold || "6.25"}</div>
            <p className="text-xs text-[var(--muted)]">Env: COI_WARN_THRESHOLD</p>
          </div>
          <div className="rounded-lg bg-[var(--cream)] p-3">
            <div className="text-xs uppercase text-[var(--muted)]">Common ancestor gens</div>
            <div className="text-xl font-semibold">{process.env.COI_COMMON_ANCESTOR_GENS || map.coi_common_ancestor_gens || "4"}</div>
            <p className="text-xs text-[var(--muted)]">Env: COI_COMMON_ANCESTOR_GENS (typical 3–5)</p>
          </div>
        </dl>
      </section>

      <section className="card">
        <h2 className="mb-3 font-serif text-lg text-[var(--brown)]">DocuSign</h2>
        <div className="mb-3 flex flex-wrap gap-2 text-sm">
          <span className="badge-neutral">Mode: {cfg.mode}</span>
          <span className={isDocuSignConfigured(cfg) ? "badge-success" : "badge-warn"}>
            {isDocuSignConfigured(cfg) ? "Credentials present" : "Not fully configured"}
          </span>
        </div>
        <ul className="mb-4 space-y-1 text-sm text-[var(--brown-soft)]">
          <li>DOCUSIGN_INTEGRATION_KEY: {cfg.integrationKey ? "set" : "empty"}</li>
          <li>DOCUSIGN_USER_ID: {cfg.userId ? "set" : "empty"}</li>
          <li>DOCUSIGN_ACCOUNT_ID: {cfg.accountId ? "set" : "empty"}</li>
          <li>
            Private key:{" "}
            {cfg.privateKeyPem
              ? "DOCUSIGN_PRIVATE_KEY set"
              : cfg.privateKeyPath
                ? `path set (${cfg.privateKeyPath})`
                : "empty"}
          </li>
          <li>DOCUSIGN_AUTH_SERVER: {cfg.authServer}</li>
          <li>DOCUSIGN_ACCOUNT_BASE_URI: {cfg.accountBaseUri}</li>
          <li>DOCUSIGN_MODE: {cfg.mode}</li>
        </ul>
        <pre className="overflow-x-auto rounded-lg bg-[var(--cream-dark)] p-3 text-xs whitespace-pre-wrap">{docusignSetupGuide()}</pre>
        <p className="mt-3 text-xs text-[var(--muted)]">
          JWT grant uses Node crypto (RS256). Sandbox/live sends create a real DocuSign envelope with status
          &quot;sent&quot;. If you see CONSENT_REQUIRED, open the consent URL once while logged into DocuSign,
          then retry. Success always includes a real API envelopeId.
        </p>
      </section>

      <section className="card">
        <h2 className="mb-3 font-serif text-lg text-[var(--brown)]">Branding</h2>
        <p className="text-sm">
          Replace files in <code className="rounded bg-[var(--cream-dark)] px-1">public/branding/</code>:
        </p>
        <ul className="mt-2 list-disc pl-5 text-sm text-[var(--brown-soft)]">
          <li>state-emblem.svg — round emblem (header left)</li>
          <li>mini-golden-doodles.svg — bone + three dogs wordmark</li>
        </ul>
      </section>
    </div>
  );
}
