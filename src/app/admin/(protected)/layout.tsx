import type { ReactNode } from "react";
import { PlatformAdminSidebar } from "@/components/PlatformAdminSidebar";

/**
 * Shared layout for every real Super Admin section (Designer, Numbering,
 * Settings, Error Log, Plans, Subscribers) — renders the sidebar ONCE so
 * it persists across navigations between them, same pattern as
 * src/app/vendor/[vendorId]/layout.tsx. Deliberately a route group
 * "(protected)" rather than /admin/layout.tsx directly, so /admin/login
 * (not yet authenticated, shouldn't show the admin sidebar) stays outside
 * it — route groups don't affect the URL, so /admin/designer etc. are
 * unaffected.
 */
export default function PlatformAdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <PlatformAdminSidebar />
      <div className="min-h-screen min-w-0 flex-1">{children}</div>
    </div>
  );
}
