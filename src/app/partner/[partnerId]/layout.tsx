import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { SupportWidget } from "@/components/SupportWidget";
import { PendingActionsBanner } from "@/components/PendingActionsBanner";
import { buildPartnerAdminNavGroups } from "@/lib/designer/partnerAdminNav";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { computeAlerts } from "@/lib/alerts";
import { getPartner } from "@/lib/partnerData";
import { getTelegramSettings } from "@/lib/telegram";
import { env } from "@/lib/env";

/**
 * Routes reachable with NO session at all — the Telecalling staff login and
 * its forced first-login password-change page. These can't go through
 * requirePartnerSessionForPage (that's exactly what they exist to satisfy),
 * so PartnerLayout skips the gate entirely for them, before it ever runs.
 */
const STAFF_AUTH_ROUTE_SUFFIXES = ["/telecalling/login", "/telecalling/change-password"];

/**
 * Entire module subtrees that are staff-only, with their OWN separate login
 * — not gated by the main partner session at all, unlike every other
 * module. Currently just POS (src/lib/pos/posAuth.ts's requirePosStaff,
 * called by each page under this prefix) — POS has no customer-facing side
 * and deliberately isn't reachable via the main partner login, so
 * PartnerLayout must skip requirePartnerSessionForPage for the whole
 * prefix, not just its own login/signup pages (unlike
 * STAFF_AUTH_ROUTE_SUFFIXES above, which only ever exempts the login pages
 * themselves — every other page in that module still expects the main
 * partner session once past login).
 */
const STAFF_ONLY_MODULE_PREFIXES = ["/pos"];

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

/**
 * Overrides the root layout's long marketing tagline
 * ("My Biz Flow — No-Code Business Management Platform for Every
 * Business") for every logged-in app screen under /partner/[partnerId]/*
 * — that tagline is meant for the public marketing/SEO pages, not a
 * partner's own workorder/billing/etc. tab title. Falls back to the bare
 * app name when the partner record isn't available (matches how the
 * Sidebar above already treats a missing partner as "no branding this
 * render" rather than failing the page).
 */
export async function generateMetadata({ params }: { params: { partnerId: string } }): Promise<Metadata> {
  const partner = await getPartner(params.partnerId).catch(() => undefined);
  return {
    title: {
      default: partner?.businessName ? `${partner.businessName} | My Biz Flow` : "My Biz Flow",
      template: "%s | My Biz Flow",
    },
  };
}

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

  if (STAFF_ONLY_MODULE_PREFIXES.some((prefix) => pathname?.startsWith(`/partner/${params.partnerId}${prefix}`))) {
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

  // Every one of these hits Postgres, and this layout runs on EVERY partner
  // page load — a single transient connection blip (Neon's pooled
  // connections do drop/time out occasionally; see the advisory-lock
  // timeout this same DB gave `prisma migrate` mid-session) in ANY of them
  // used to 500 the whole page via Promise.all's fail-fast behavior. Alerts
  // and Telegram-connection status are supplementary banners, not required
  // for the page to function, so they degrade to empty/disconnected on
  // failure instead of taking the page down with them. Nav groups and the
  // partner record are load-bearing (sidebar, branding) — those still
  // reject, but only that one Promise.all entry fails to resolve/timeout
  // together with the others now surfaces cleanly instead of masking
  // itself as this file's own logic.
  const [navGroups, alerts, partner, telegramSettings] = await Promise.all([
    buildPartnerAdminNavGroups(params.partnerId),
    // Alerts are computed here rather than in each page so the bell's count is
    // correct on every partner screen, and recomputed on each server render
    // rather than cached — see src/lib/alerts.ts for why nothing is stored.
    computeAlerts(params.partnerId).catch(() => []),
    // Used here only for sidebar branding/the trial banner — both already
    // handle a missing partner gracefully (optional chaining below), so a
    // transient failure degrades to "no branding this render" rather than
    // crashing the whole page.
    getPartner(params.partnerId).catch(() => undefined),
    getTelegramSettings(params.partnerId).catch(
      () => ({ partnerId: params.partnerId, chatId: null, chatTitle: null, groupChatId: null, groupChatTitle: null, routing: {}, lastReportSentAt: null })
    ),
  ]);
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        partnerId={params.partnerId}
        navGroups={navGroups}
        alerts={alerts}
        logoDataUrl={partner?.logoDataUrl ?? null}
        partnerName={partner?.businessName ?? null}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {partner && (
          <PendingActionsBanner
            partnerId={params.partnerId}
            subscriptionStatus={partner.subscriptionStatus}
            trialEndAt={partner.trialEndAt}
            telegramConnected={!!(telegramSettings.chatId || telegramSettings.groupChatId)}
          />
        )}
        {children}
      </div>
      <SupportWidget partnerId={params.partnerId} whatsappNumber={env.platformSupportWhatsappNumber()} />
    </div>
  );
}
