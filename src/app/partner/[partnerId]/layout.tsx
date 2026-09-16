import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { SupportWidget } from "@/components/SupportWidget";
import { buildPartnerAdminNavGroups } from "@/lib/designer/partnerAdminNav";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { computeAlerts } from "@/lib/alerts";
import { getPartner } from "@/lib/partnerData";
import { env } from "@/lib/env";

/**
 * Routes reachable with NO session at all — the Telecalling staff login and
 * its forced first-login password-change page. These can't go through
 * requirePartnerSessionForPage (that's exactly what they exist to satisfy),
 * so PartnerLayout skips the gate entirely for them, before it ever runs.
 */
const STAFF_AUTH_ROUTE_SUFFIXES = ["/telecalling/login", "/telecalling/change-password"];

/**
 * Per-role home path a staff session lands on when it tries to reach a page
 * outside the module its role belongs to (see PageSession's "staff" doc
 * comment in requirePartnerSession.ts). Only Telecaller is wired up today.
 */
const STAFF_ROLE_ALLOWED_PREFIX: Record<string, string> = {
  Telecaller: "/telecalling",
};

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
const PRINT_ROUTE_SUFFIXES = ["/document", "/estimate", "/invoice", "/service-record", "/receipt"];

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
  const pathname = headers().get("x-pathname");

  if (STAFF_AUTH_ROUTE_SUFFIXES.some((suffix) => pathname?.endsWith(suffix))) {
    return <>{children}</>;
  }

  const session = await requirePartnerSessionForPage(params.partnerId);

  // Print-style document pages render on their own, chrome-free — see
  // PRINT_ROUTE_SUFFIXES above. Skip the nav-building/alerts work too,
  // since none of it is used when the Sidebar itself isn't rendered.
  if (isPrintRoute(pathname)) {
    return <>{children}</>;
  }

  if (session.kind === "staff") {
    const allowedPrefix = STAFF_ROLE_ALLOWED_PREFIX[session.role];
    const modulePath = `/partner/${params.partnerId}${allowedPrefix ?? ""}`;
    if (!allowedPrefix || !pathname?.startsWith(modulePath)) {
      // Unknown/unwired role, or trying to reach a page outside their own
      // module — a staff session grants no access anywhere else (see
      // PageSession's doc comment), so send them back to the one place
      // they're allowed rather than rendering a 500 from some other
      // module's data layer.
      redirect(allowedPrefix ? `${modulePath}/queue` : "/login");
    }
    // No owner Sidebar for a staff session — every other module's pages
    // are unreachable to them anyway (see above), so the full business nav
    // would just be a list of dead links plus a data-shape leak (module
    // names/labels) to someone who is not the business owner.
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
