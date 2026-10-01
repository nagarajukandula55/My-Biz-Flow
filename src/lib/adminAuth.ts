import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";

// Shared administrator credentials remain a bootstrap limitation. The session
// itself is signed and expires server-side; legacy static hashes are rejected.
export const ADMIN_COOKIE_NAME = "mbf_admin_session";
export const ADMIN_SESSION_MAX_AGE = 8 * 60 * 60;
const key = () => new TextEncoder().encode(env.superAdminSecret());
export async function computeAdminCookieValue(): Promise<string> {
  return new SignJWT({ purpose: "platform-admin-session" }).setProtectedHeader({ alg: "HS256" })
    .setIssuedAt().setExpirationTime(`${ADMIN_SESSION_MAX_AGE}s`).sign(key());
}
export async function isValidAdminCookie(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  try {
    const { payload } = await jwtVerify(value, key(), { algorithms: ["HS256"] });
    return payload.purpose === "platform-admin-session" && typeof payload.exp === "number";
  } catch { return false; }
}
export function safeAdminNextPath(value: string): string {
  return /^\/admin(?:\/[A-Za-z0-9_/-]*)?$/.test(value) ? value : "/admin/system";
}
