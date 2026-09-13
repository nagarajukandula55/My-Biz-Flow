import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { buildPartnerAdminNavGroups } from "@/lib/designer/partnerAdminNav";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";

/**
 * Shared layout for every /partner/[partnerId]/* route — renders the
 * sidebar ONCE here instead of inside each page (see Sidebar.tsx's header
 * for why: a per-page sidebar unmounts/remounts on every navigation,
 * resetting collapse state and causing a visible full-shell flash. A
 * layout.tsx persists across client-side navigations between sibling
 * routes it wraps, so the sidebar now stays mounted while only the page
 * content below it swaps.
 *
 * Also the single tenant-isolation gate for this whole subtree: every
 * page under /partner/[partnerId]/* renders through this layout, so
 * checking the session here (redirecting to /login on a missing or
 * mismatched session) covers every module's pages at once, instead of
 * each module needing its own check. Server Actions still need their own
 * check too (see requireSessionPartnerId) since they don't run through a
 * layout.
 */
export default async function PartnerLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { partnerId: string };
}) {
  await requirePartnerSessionForPage(params.partnerId);
  const navGroups = await buildPartnerAdminNavGroups(params.partnerId);
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar partnerId={params.partnerId} navGroups={navGroups} />
      {children}
    </div>
  );
}
