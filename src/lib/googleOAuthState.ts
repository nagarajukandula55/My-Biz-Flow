/**
 * Shared between src/app/api/auth/google/route.ts (sets it) and
 * src/app/api/auth/google/callback/route.ts (verifies it) — can't live in
 * either route.ts file directly, since Next.js only allows specific named
 * exports (GET, POST, dynamic, ...) from a route module; anything else
 * fails the build ("X is not a valid Route export field").
 */
export const GOOGLE_OAUTH_STATE_COOKIE = "mbf_google_oauth_state";
