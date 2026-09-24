import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  getAllowedEmails,
  getAppBaseUrl,
  getGoogleRedirectUri,
  htmlPage,
  isGoogleConfigured,
} from "@/lib/google-auth";
import { prisma } from "@/lib/prisma";

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  email?: string;
  email_verified?: boolean;
  name?: string;
  sub?: string;
};

export async function GET(req: Request) {
  if (!isGoogleConfigured()) {
    return htmlPage(
      "Google login not configured",
      `<p>Sign in with Google is not set up yet.</p>`,
      503,
    );
  }

  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  if (error) {
    return htmlPage(
      "Google sign-in cancelled",
      `<p>Google returned: <code>${escapeHtml(error)}</code>. You can try again or use a local account.</p>`,
      400,
    );
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = cookies().get(GOOGLE_OAUTH_STATE_COOKIE)?.value;

  cookies().set(GOOGLE_OAUTH_STATE_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });

  if (!code || !state || !storedState || state !== storedState) {
    return htmlPage(
      "Invalid sign-in request",
      `<p>The Google sign-in request was missing a code or failed the security check. Please try again from the login page.</p>`,
      400,
    );
  }

  const redirectUri = getGoogleRedirectUri(req);
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenJson = (await tokenRes.json().catch(() => ({}))) as GoogleTokenResponse;
  if (!tokenRes.ok || !tokenJson.access_token) {
    return htmlPage(
      "Google token exchange failed",
      `<p>Could not complete sign-in with Google. Please try again later.</p>`,
      502,
    );
  }

  const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  const userInfo = (await userInfoRes.json().catch(() => ({}))) as GoogleUserInfo;
  if (!userInfoRes.ok || !userInfo.email) {
    return htmlPage(
      "Could not read Google profile",
      `<p>Google did not return an email address. Ensure the account has an email and try again.</p>`,
      502,
    );
  }

  const email = userInfo.email.toLowerCase().trim();
  if (!getAllowedEmails().has(email)) {
    return htmlPage(
      "Access denied",
      `<p>The Google account <strong>${escapeHtml(email)}</strong> is not authorized for this kennel app. Only approved staff emails can sign in.</p>`,
      403,
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  let user = existing;
  if (!user) {
    const unusable = randomBytes(32).toString("hex");
    const passwordHash = await bcrypt.hash(unusable, 10);
    user = await prisma.user.create({
      data: {
        email,
        name: (userInfo.name || email.split("@")[0] || "User").trim(),
        passwordHash,
      },
    });
  }

  await createSession({ id: user.id, email: user.email, name: user.name });
  return NextResponse.redirect(`${getAppBaseUrl(req)}/`);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
