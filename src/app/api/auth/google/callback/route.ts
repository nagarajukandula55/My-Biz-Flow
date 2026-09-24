import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { env, googleOAuthConfigured } from "@/lib/env";
import { findPartnerByEmail } from "@/lib/partnerData";
import { completePartnerLogin } from "@/lib/completePartnerLogin";
import { GOOGLE_OAUTH_STATE_COOKIE } from "../route";

/**
 * Step 2 of the Google Sign-In flow. Verifies the CSRF `state`, exchanges
 * the authorization `code` for tokens, cryptographically verifies the
 * returned `id_token`'s signature against Google's published JWKS (NOT a
 * bare decode — see verifyGoogleIdToken below), then looks up a Partner by
 * the verified email. This is a LOGIN method only: on no match, redirects
 * with an error rather than creating a new partner account.
 */
function siteUrl(request: Request): string {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
}

// Cached across invocations (module scope) — createRemoteJWKSet handles its
// own fetching/caching of Google's public keys internally.
const googleJwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

/**
 * Verifies a Google id_token per Google's documented rules: valid signature
 * (checked against Google's live JWKS, not just decoded), issuer is exactly
 * accounts.google.com or https://accounts.google.com, audience matches our
 * own client id, token not expired (jwtVerify checks `exp` automatically),
 * and the email Google is vouching for is actually verified
 * (`email_verified: true` — Google can return an email on the id_token for
 * an unverified address, which must not be trusted for login matching).
 * Throws on any failure; callers must catch and treat as "sign-in failed."
 */
async function verifyGoogleIdToken(idToken: string, clientId: string): Promise<{ email: string }> {
  const { payload } = await jwtVerify(idToken, googleJwks, {
    issuer: ["accounts.google.com", "https://accounts.google.com"],
    audience: clientId,
  });
  if (payload.email_verified !== true) {
    throw new Error("Google account email is not verified");
  }
  if (typeof payload.email !== "string" || !payload.email) {
    throw new Error("Google id_token missing email claim");
  }
  return { email: payload.email };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const loginErrorRedirect = (code: string) => NextResponse.redirect(new URL(`/login?error=${code}`, request.url));

  if (!googleOAuthConfigured()) {
    return loginErrorRedirect("google_not_configured");
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = cookies().get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  // Clear the one-time state cookie regardless of outcome — it must never be reusable.
  cookies().delete(GOOGLE_OAUTH_STATE_COOKIE);

  if (!code || !state || !cookieState || state !== cookieState) {
    return loginErrorRedirect("google_invalid_state");
  }

  const redirectUri = `${siteUrl(request)}/api/auth/google/callback`;
  const clientId = env.googleClientId()!;
  const clientSecret = env.googleClientSecret()!;

  let idToken: string;
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) {
      console.error("[auth/google/callback] token exchange failed:", tokenRes.status, await tokenRes.text().catch(() => ""));
      return loginErrorRedirect("google_auth_failed");
    }
    const tokenBody = (await tokenRes.json()) as { id_token?: string };
    if (!tokenBody.id_token) {
      return loginErrorRedirect("google_auth_failed");
    }
    idToken = tokenBody.id_token;
  } catch (err) {
    console.error("[auth/google/callback] token exchange error:", err);
    return loginErrorRedirect("google_auth_failed");
  }

  let email: string;
  try {
    const verified = await verifyGoogleIdToken(idToken, clientId);
    email = verified.email;
  } catch (err) {
    console.error("[auth/google/callback] id_token verification failed:", err);
    return loginErrorRedirect("google_auth_failed");
  }

  const partner = await findPartnerByEmail(email);
  if (!partner) {
    // Deliberately NOT auto-creating a partner here — Google Sign-In is a
    // login method for an existing account only.
    return loginErrorRedirect("google_no_account");
  }

  const result = await completePartnerLogin(partner);
  if (!result.ok) {
    return loginErrorRedirect("server_misconfigured");
  }
  return NextResponse.redirect(new URL(result.redirectPath, request.url));
}
