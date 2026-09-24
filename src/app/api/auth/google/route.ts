import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { env, googleOAuthConfigured } from "@/lib/env";

/**
 * Step 1 of the Google Sign-In OAuth Authorization Code flow (see
 * src/app/api/auth/google/callback/route.ts for step 2). Redirects to
 * Google's consent screen with a CSRF `state` value that's also stashed in
 * a short-lived, httpOnly, signed-nothing-but-random cookie — the callback
 * verifies the `state` it gets back against this cookie before trusting
 * anything else in the callback request, which is the standard mitigation
 * for this flow (an attacker who can't read/set this cookie on the victim's
 * browser can't forge a matching state).
 */
export const GOOGLE_OAUTH_STATE_COOKIE = "mbf_google_oauth_state";

function siteUrl(request: Request): string {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
}

export function GET(request: Request) {
  if (!googleOAuthConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", request.url));
  }

  const state = randomBytes(24).toString("hex");
  const redirectUri = `${siteUrl(request)}/api/auth/google/callback`;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", env.googleClientId()!);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authUrl.toString());
  cookies().set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60, // 10 minutes — plenty for a user to complete the consent screen
  });
  return response;
}
