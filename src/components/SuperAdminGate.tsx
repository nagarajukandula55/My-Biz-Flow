import type { ReactNode } from "react";

/**
 * Wraps every page under a module's admin/ subfolder. Per DESIGN_SYSTEM.md
 * §8, a module folder holds exactly two kinds of pages: normal (vendor-
 * facing) pages, and admin/ pages gated to Super Admin — nothing else.
 *
 * Route-level access IS now enforced — src/middleware.ts blocks any
 * request under /admin or a module's admin subfolder without a valid
 * session cookie, redirecting to /admin/login. But that's a single
 * shared secret (see
 * src/lib/adminAuth.ts), not real per-user auth: no individual admin
 * identity, no role granularity, no audit trail of WHO made a change. This
 * banner stays visible as a reminder of that gap until NextAuth + per-user
 * roles replace it.
 */
export function SuperAdminGate({ children }: { children: ReactNode }) {
  return (
    <div>
      <div className="mb-4 rounded-md border border-warning-soft bg-warning-soft px-4 py-2 text-xs font-semibold text-warning">
        Route access is gated by a shared Super Admin secret (middleware +
        src/lib/adminAuth.ts) — not yet real per-user auth. No individual
        admin identity or audit trail exists until NextAuth is wired up.
      </div>
      {children}
    </div>
  );
}
