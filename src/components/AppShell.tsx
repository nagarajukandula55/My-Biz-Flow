import type { ReactNode } from "react";

// Re-exported for the handful of pages that still import nav types from
// here — the sidebar itself now lives in src/components/Sidebar.tsx,
// rendered once from src/app/vendor/[vendorId]/layout.tsx so it persists
// across client-side navigations instead of remounting on every page.
export type { NavDotVariant, NavItem, NavSubItem, NavGroup } from "./Sidebar";

type AppShellProps = {
  topbarTitle: string;
  topbarActions?: ReactNode;
  children: ReactNode;
};

/**
 * The per-page topbar + content area. Deliberately NOT the sidebar
 * anymore (see Sidebar.tsx's header for why) — every vendor page still
 * wraps its content in this for the topbar title/actions row.
 */
export function AppShell({ topbarTitle, topbarActions, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen min-w-0 flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border bg-bg-raised px-6 py-3">
        <h1 className="font-display text-base font-bold text-text">{topbarTitle}</h1>
        {topbarActions}
      </header>
      <main className="mbf-page min-w-0 flex-1 bg-bg">{children}</main>
    </div>
  );
}
