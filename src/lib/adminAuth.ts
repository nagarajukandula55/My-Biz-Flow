import { env } from "./env";

/**
 * Minimal Super Admin gate — a real access check, but explicitly NOT full
 * auth. There is no user/session/role system yet (Prisma isn't wired up),
 * so this is a single shared-secret gate: one password (SUPER_ADMIN_SECRET)
 * grants Super Admin access to everyone who has it, with no per-person
 * identity, audit trail of WHO the admin was, or role granularity.
 *
 * This exists so admin routes are not literally public while real auth is
 * pending — it is a stopgap, not a destination. Replace with NextAuth +
 * per-user roles (PlatformUser.businessAccess[].role, matching central-api's
 * own model) when the auth/session layer is built, and delete this file.
 *
 * Uses the Web Crypto API (`crypto.subtle`), not Node's `node:crypto` —
 * this file is imported from src/middleware.ts, which runs on the Edge
 * runtime and cannot bundle Node built-ins. Web Crypto works in both Edge
 * and Node, so one implementation covers both call sites.
 */

export const ADMIN_COOKIE_NAME = "mbf_admin_session";

/**
 * The cookie stores a hash of the secret, not the secret itself — so the
 * plaintext password isn't sitting in a browser cookie jar or request log.
 * This is still just a shared token, not a real session (no expiry,
 * no revocation, no per-user identity) — see file header.
 */
export async function computeAdminCookieValue(): Promise<string> {
  const data = new TextEncoder().encode(env.superAdminSecret());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function isValidAdminCookie(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  try {
    return value === (await computeAdminCookieValue());
  } catch {
    return false;
  }
}
