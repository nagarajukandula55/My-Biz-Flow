/**
 * React's `cache()` only works inside an actual React render (Server
 * Components) — it's undefined (or throws) when the same module is
 * imported by a plain Node script (e.g. anything run via `npx tsx
 * scripts/*.ts`, including the AN-CRM migration scripts). Every function in
 * this app wrapped in `cache()` for per-request de-duplication is also a
 * function scripts legitimately need to call directly, so a raw `cache()`
 * import crashes any script that transitively imports it — confirmed by
 * `scripts/migrate-an-crm-businesses-to-mbf.ts` failing outright with
 * "(0, import_react.cache) is not a function" the moment it imported
 * businessRecords.ts.
 *
 * This wraps a function in React's cache() when available, and simply
 * returns the function UNWRAPPED (no de-dup, but no crash) when it isn't —
 * safe in both contexts. De-dup is a per-request optimization only; running
 * unwrapped in a script (which has no concept of "one request" anyway) is
 * exactly the right fallback, not a degraded behavior.
 */
export function safeCache<Args extends unknown[], R>(fn: (...args: Args) => R): (...args: Args) => R {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { cache } = require("react") as { cache?: <F extends (...a: any[]) => any>(f: F) => F };
    if (typeof cache === "function") return cache(fn);
  } catch {
    // "react" not resolvable at all in this context (shouldn't happen in
    // this app, but fall through to the unwrapped function regardless).
  }
  return fn;
}
