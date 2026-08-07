import type { ReactNode } from "react";

/**
 * Wraps every page under a module's admin/ subfolder. Per DESIGN_SYSTEM.md
 * §8, a module folder holds exactly two kinds of pages: normal (vendor-
 * facing) pages, and admin/ pages gated to Super Admin — nothing else.
 *
 * Auth is not wired up yet (no backend/session layer exists in this pass),
 * so this currently renders a visible "not yet enforced" notice instead of
 * silently allowing access — that's deliberate: it keeps the gap visible
 * in every admin page's output rather than letting an unguarded admin
 * screen look identical to a properly-protected one. Replace the body of
 * this component with a real session/role check when auth lands, and this
 * notice should disappear as part of that change.
 */
export function SuperAdminGate({ children }: { children: ReactNode }) {
  return (
    <div>
      <div className="mb-4 rounded-md border border-warning-soft bg-warning-soft px-4 py-2 text-xs font-semibold text-warning">
        Super Admin access is not yet enforced — auth/session layer is not
        wired up in this pass. This boundary exists in the folder structure
        and must gate real access once auth is built.
      </div>
      {children}
    </div>
  );
}
