import type { ReactNode } from "react";
import { headers } from "next/headers";
import { Sidebar } from "@/components/Sidebar";
import { SupportWidget } from "@/components/SupportWidget";
import { buildPartnerAdminNavGroups } from "@/lib/designer/partnerAdminNav";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { computeAlerts } from "@/lib/alerts";
import { getPartner } from "@/lib/partnerData";
import { env } from "@/lib/env";

/**
 * Print-style document routes — the printable Job Card/Estimate/Service
 * Record/Sales Invoice pages opened via openPrintPopup() (see
 * src/lib/openPrintPopup.ts and its callers) into a small popup window.
 * These must render with NO sidebar at all — a popup sized for a print
 * preview showing the app's full nav is exactly the AN-CRM-layout mismatch
 * reported ("without outside sidebar ... proper printing"), and unlike
 * @media print (which already hides the Sidebar only while the browser's
 * print dialog is open), the popup shows the sidebar on screen the whole
 * time otherwise. Matched by suffix since these routes exist under
 * several modules (service-centre, billing, pos, amc-field-service, …).
 */
const PRINT_ROUTE_SUFFIXES = ["/document", "/estimate", "/invoice", "/service-record", "/receipt", "/intake-receipt"];

function isPrintRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return PRINT_ROUTE_SUFFIXES.some((suffix) => pathname.endsWith(suffix));
}

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

  // Print-style document pages render on their own, chrome-free — see
  // PRINT_ROUTE_SUFFIXES above. Skip the nav-building/alerts work too,
  // since none of it is used when the Sidebar itself isn't rendered.
  if (isPrintRoute(headers().get("x-pathname"))) {
    return <>{children}</>;
  }

  const [navGroups, alerts, partner] = await Promise.all([
    buildPartnerAdminNavGroups(params.partnerId),
    // Alerts are computed here rather than in each page so the bell's count is
    // correct on every partner screen, and recomputed on each server render
    // rather than cached — see src/lib/alerts.ts for why nothing is stored.
    computeAlerts(params.partnerId),
    getPartner(params.partnerId),
  ]);
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        partnerId={params.partnerId}
        navGroups={navGroups}
        alerts={alerts}
        logoDataUrl={partner?.logoDataUrl ?? null}
      />
      {children}
      <SupportWidget partnerId={params.partnerId} whatsappNumber={env.platformSupportWhatsappNumber()} />
    </div>
  );
}
