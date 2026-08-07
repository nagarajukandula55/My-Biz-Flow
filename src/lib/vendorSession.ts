/**
 * Demo vendor session cookie name. This is NOT real auth — there is no
 * user/session table, no password check against a real record, no vendor
 * lookup. Mirrors the honesty pattern of src/lib/adminAuth.ts /
 * src/app/admin/login/actions.ts: a stopgap so the login flow is walkable
 * end-to-end, clearly labeled, and easy to rip out once real auth
 * (NextAuth + central-api-backed sessions) is built.
 */
export const VENDOR_SESSION_COOKIE = "mbf_vendor_session";
