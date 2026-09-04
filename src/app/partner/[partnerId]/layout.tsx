import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { buildPartnerAdminNavGroups } from "@/lib/designer/partnerAdminNav";

/**
 * Shared layout for every /partner/[partnerId]/* route — renders the
 * sidebar ONCE here instead of inside each page (see Sidebar.tsx's header
 * for why: a per-page sidebar unmounts/remounts on every navigation,
 * resetting collapse state and causing a visible full-shell flash. A
 * layout.tsx persists across client-side navigations between sibling
 * routes it wraps, so the sidebar now stays mounted while only the page
 * content below it swaps.
 */
export default async function PartnerLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { partnerId: string };
}) {
  const navGroups = await buildPartnerAdminNavGroups();
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar partnerId={params.partnerId} navGroups={navGroups} />
      {children}
    </div>
  );
}
