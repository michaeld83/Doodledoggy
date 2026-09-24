import { randomBytes } from "crypto";

const DEFAULT_ALLOWED = ["michaeld83@gmail.com", "christylee123@gmail.com"];

export const GOOGLE_OAUTH_STATE_COOKIE = "dd_google_oauth_state";

export function getAllowedEmails(): Set<string> {
  const fromEnv = process.env.GOOGLE_ALLOWED_EMAILS;
  if (fromEnv?.trim()) {
    return new Set(
      fromEnv
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    );
  }
  return new Set(DEFAULT_ALLOWED);
}

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

/**
 * Redirect URI base: use the request origin when it is localhost (local dev),
 * otherwise APP_BASE_URL (production), else fall back to localhost:3000.
 */
export function getAppBaseUrl(req: Request): string {
  const url = new URL(req.url);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    return `${url.protocol}//${url.host}`;
  }

  const configured = process.env.APP_BASE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;

  return `${url.protocol}//${url.host}`;
}

export function getGoogleRedirectUri(req: Request): string {
  return `${getAppBaseUrl(req)}/api/auth/google/callback`;
}

export function buildGoogleAuthorizeUrl(req: Request, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: getGoogleRedirectUri(req),
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function newOAuthState(): string {
  return randomBytes(24).toString("base64url");
}

export function htmlPage(title: string, body: string, status = 200): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} · Doodledoggy</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #faf7f2; color: #3d3226;
      display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; padding: 1rem; }
    .card { background: #fffdf9; border: 1px solid #ddd2c0; border-radius: 12px; padding: 2rem;
      max-width: 28rem; width: 100%; box-shadow: 0 1px 2px rgba(0,0,0,.05); text-align: center; }
    h1 { font-size: 1.25rem; margin: 0 0 .75rem; }
    p { color: #8a7d6b; font-size: .95rem; line-height: 1.5; margin: 0 0 1.25rem; }
    code { font-size: .85em; background: #f0ebe3; padding: .1em .35em; border-radius: 4px; }
    a { display: inline-block; background: linear-gradient(180deg,#d4b03a,#c9a227); color: #fff;
      text-decoration: none; padding: .6rem 1.25rem; border-radius: .5rem; font-weight: 600; font-size: .875rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    ${body}
    <p style="margin-top:1.5rem;margin-bottom:0"><a href="/login">Back to login</a></p>
  </div>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
