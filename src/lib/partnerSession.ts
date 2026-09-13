import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";

/**
 * Partner session cookie. Previously this stored the partner id as a plain,
 * unsigned value — anyone could open devtools, edit the cookie to a
 * different VND#### id, and read/write that partner's data with no
 * cryptographic check at all (full impersonation, no forgery detection).
 *
 * Now the cookie holds a signed JWT (HS256, via `jose` — Edge-runtime
 * compatible, unlike `jsonwebtoken`) whose payload is just the partner id
 * plus standard issued-at/expiry claims. A tampered or expired token fails
 * verification and is treated as "not signed in." This is still not full
 * auth (no session table, no revocation before expiry — see the file
 * header this replaced), but it can no longer be forged by hand-editing a
 * cookie value.
 */
export const PARTNER_SESSION_COOKIE = "mbf_partner_session";

const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours — matches the cookie maxAge set at login

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.partnerSessionSecret());
}

/** Signs a partner id into a JWT suitable for the session cookie value. */
export async function createPartnerSessionToken(partnerId: string): Promise<string> {
  return new SignJWT({ partnerId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

/**
 * Verifies a session cookie value and returns the partner id it was issued
 * for, or `undefined` if the token is missing, malformed, expired, or
 * signed with a different secret (i.e. forged).
 */
export async function verifyPartnerSessionToken(token: string | undefined): Promise<string | undefined> {
  if (!token) return undefined;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const partnerId = payload.partnerId;
    return typeof partnerId === "string" ? partnerId : undefined;
  } catch {
    return undefined;
  }
}

/** How long the session cookie itself should live (Set-Cookie maxAge) — kept in sync with the JWT's own expiry. */
export const PARTNER_SESSION_MAX_AGE_SECONDS = SESSION_TTL_SECONDS;
