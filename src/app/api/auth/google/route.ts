import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  buildGoogleAuthorizeUrl,
  htmlPage,
  isGoogleConfigured,
  newOAuthState,
} from "@/lib/google-auth";

export async function GET(req: Request) {
  if (!isGoogleConfigured()) {
    return htmlPage(
      "Google login not configured",
      `<p>Sign in with Google is not set up yet. Ask an admin to set <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code>, or use a local account below.</p>`,
      503,
    );
  }

  const state = newOAuthState();
  cookies().set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });

  return NextResponse.redirect(buildGoogleAuthorizeUrl(req, state));
}
