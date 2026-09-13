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
 * for, or `undefined` if the token is missing, malformed, expired, signed
 * with a different secret (i.e. forged), or carries a `purpose` claim (a
 * password-reset or staff-session token handed to this function by mistake
 * or by an attacker) — a genuine partner-owner session token never sets one.
 */
export async function verifyPartnerSessionToken(token: string | undefined): Promise<string | undefined> {
  if (!token) return undefined;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.purpose !== undefined) return undefined;
    const partnerId = payload.partnerId;
    return typeof partnerId === "string" ? partnerId : undefined;
  } catch {
    return undefined;
  }
}

/** How long the session cookie itself should live (Set-Cookie maxAge) — kept in sync with the JWT's own expiry. */
export const PARTNER_SESSION_MAX_AGE_SECONDS = SESSION_TTL_SECONDS;

/**
 * Password-reset link token. Signed with the SAME secret as the session
 * cookie above (one signing mechanism for the whole app, per
 * PARTNER_SESSION_SECRET's doc comment in env.ts), but carries a distinct
 * `purpose: "password-reset"` claim precisely so a leaked/forwarded reset
 * link can never be replayed as a login session token (and vice versa) —
 * verifyPartnerSessionToken above never checks `purpose`, so a session
 * token would otherwise "verify" fine if someone tried it here, and a
 * reset token would otherwise "verify" fine as a session cookie. The
 * purpose check below is what actually prevents that cross-use.
 */
const RESET_TOKEN_PURPOSE = "password-reset";
const RESET_TOKEN_TTL_SECONDS = 30 * 60; // 30 minutes

/** Signs a short-lived, single-purpose password-reset token for the given partner id. */
export async function createPasswordResetToken(partnerId: string): Promise<string> {
  return new SignJWT({ partnerId, purpose: RESET_TOKEN_PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${RESET_TOKEN_TTL_SECONDS}s`)
    .sign(secretKey());
}

/**
 * Verifies a password-reset token and returns the partner id it was issued
 * for, or `undefined` if it's missing, malformed, expired, signed with a
 * different secret, or — critically — not actually a reset token (e.g. a
 * session cookie value handed to this function by mistake or by an
 * attacker) since it lacks `purpose: "password-reset"`.
 */
export async function verifyPasswordResetToken(token: string | undefined | null): Promise<string | undefined> {
  if (!token) return undefined;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.purpose !== RESET_TOKEN_PURPOSE) return undefined;
    const partnerId = payload.partnerId;
    return typeof partnerId === "string" ? partnerId : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Staff session cookie/token — for a PartnerStaff account (technician,
 * front-desk, manager, etc.) logged in under a single Partner, distinct
 * from that Partner's own owner-level session above. Signed with the SAME
 * secret (one signing mechanism for the whole app), but carries
 * `purpose: "staff-session"` plus BOTH partnerId and staffId so a staff
 * token can never verify as a partner-owner session (verifyPartnerSessionToken
 * rejects any token with a `purpose` claim) and is always scoped to one
 * specific partner + staff row, never just "any staff member."
 */
export const STAFF_SESSION_COOKIE = "mbf_staff_session";
const STAFF_SESSION_PURPOSE = "staff-session";
const STAFF_SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours, same as the owner session

export type StaffSessionClaims = { partnerId: string; staffId: string };

/** Signs a (partnerId, staffId) pair into a JWT suitable for the staff session cookie value. */
export async function createStaffSessionToken(claims: StaffSessionClaims): Promise<string> {
  return new SignJWT({ partnerId: claims.partnerId, staffId: claims.staffId, purpose: STAFF_SESSION_PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${STAFF_SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

/**
 * Verifies a staff session cookie value and returns the (partnerId, staffId)
 * it was issued for, or `undefined` if missing/malformed/expired/forged, or
 * not actually a staff-session token (missing/wrong `purpose` — e.g. a
 * partner-owner session cookie or a password-reset token handed to this
 * function by mistake).
 */
export async function verifyStaffSessionToken(token: string | undefined): Promise<StaffSessionClaims | undefined> {
  if (!token) return undefined;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.purpose !== STAFF_SESSION_PURPOSE) return undefined;
    const { partnerId, staffId } = payload;
    if (typeof partnerId !== "string" || typeof staffId !== "string") return undefined;
    return { partnerId, staffId };
  } catch {
    return undefined;
  }
}

/** How long the staff session cookie itself should live (Set-Cookie maxAge) — kept in sync with the JWT's own expiry. */
export const STAFF_SESSION_MAX_AGE_SECONDS = STAFF_SESSION_TTL_SECONDS;

/**
 * One-time credential handoff cookie — replaces putting a freshly generated
 * password in a redirect URL's query string (`/signup/success?password=...`),
 * which lands in browser history, the referrer header of any outbound link
 * on that page, and server access logs. Instead the password is signed into
 * a short-lived, httpOnly, single-purpose JWT, stashed in its own cookie by
 * the action that generates the password, and read back once by the very
 * next page render. A 5-minute TTL means even an un-cleared cookie stops
 * being usable almost immediately; callers should also clear the cookie
 * once shown (see `clearOneTimeCredentialCookie`).
 */
export const ONE_TIME_CREDENTIAL_COOKIE = "mbf_onetime_credential";
const ONE_TIME_CREDENTIAL_PURPOSE = "onetime-credential";
const ONE_TIME_CREDENTIAL_TTL_SECONDS = 5 * 60; // 5 minutes — just long enough for the redirect + render

export type OneTimeCredentialClaims = { partnerId: string; password: string };

/** Signs a (partnerId, password) pair for one-shot display on the very next page render. */
export async function createOneTimeCredentialToken(claims: OneTimeCredentialClaims): Promise<string> {
  return new SignJWT({ partnerId: claims.partnerId, password: claims.password, purpose: ONE_TIME_CREDENTIAL_PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ONE_TIME_CREDENTIAL_TTL_SECONDS}s`)
    .sign(secretKey());
}

/** Verifies a one-time-credential cookie value and returns the claims, or undefined if missing/expired/forged/wrong-purpose. */
export async function verifyOneTimeCredentialToken(
  token: string | undefined
): Promise<OneTimeCredentialClaims | undefined> {
  if (!token) return undefined;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.purpose !== ONE_TIME_CREDENTIAL_PURPOSE) return undefined;
    const { partnerId, password } = payload;
    if (typeof partnerId !== "string" || typeof password !== "string") return undefined;
    return { partnerId, password };
  } catch {
    return undefined;
  }
}

export const ONE_TIME_CREDENTIAL_MAX_AGE_SECONDS = ONE_TIME_CREDENTIAL_TTL_SECONDS;
