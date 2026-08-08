import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { buildVendorAdminNavGroups } from "@/lib/designer/vendorAdminNav";

/**
 * Shared layout for every /vendor/[vendorId]/* route — renders the
 * sidebar ONCE here instead of inside each page (see Sidebar.tsx's header
 * for why: a per-page sidebar unmounts/remounts on every navigation,
 * resetting collapse state and causing a visible full-shell flash. A
 * layout.tsx persists across client-side navigations between sibling
 * routes it wraps, so the sidebar now stays mounted while only the page
 * content below it swaps.
 */
export default async function VendorLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { vendorId: string };
}) {
  const navGroups = await buildVendorAdminNavGroups();
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar vendorId={params.vendorId} navGroups={navGroups} />
      {children}
    </div>
  );
}
