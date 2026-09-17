import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { DashboardWidget } from "@/components/DashboardWidget";
import { getVisibleModuleSlugs, getVisibleModules } from "@/lib/designer/entitlements";
import { computeModuleStat, getServiceCentreOverview, getRevenueBreakdown, getCallsThisMonth } from "@/lib/analyticsData";
import { formatCurrencyINR } from "@/lib/format";
import { registerPage } from "@/lib/designer/registry";

registerPage({
  id: "platform.partner-dashboard",
  moduleSlug: "platform",
  title: "Dashboard — Type-wise",
  path: "/partner/[partnerId]/dashboard",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [
    { key: "enabled-modules", label: "Which modules generate a widget here" },
    { key: "widget-order", label: "Widget order" },
    { key: "revenue-breakdown", label: "Revenue Collected strip (Today/Week/Month/Year)" },
    { key: "telecalling-calls", label: "Telecalling calls-this-month card" },
    { key: "service-centre-overview", label: "Service Centre overview strip (period/open cards)" },
  ],
  explanation:
    "Not one hardcoded dashboard and not 21 separate per-module dashboards — this page is dynamically composed from whichever modules this partner is BOTH enabled for and holds an active access key for (getVisibleModuleSlugs, src/lib/designer/entitlements.ts), generating one DashboardWidget per module via a generic aggregation helper (computeModuleStat) rather than per-module logic repeated 21 times. A partner whose access key for a module gets revoked loses that widget immediately, independent of their plan. Every partner gets a business-facing Revenue Collected strip (Today/This Week/This Month/This Year, all the same amountPaid/Paid-totalAmount definition used across analyticsData.ts — see getRevenueBreakdown), shown regardless of which modules are enabled since Billing revenue matters to the business itself, not just to a module. Partners with the Telecalling module additionally see a Calls This Month card (getCallsThisMonth, backed by the `Call` table logged per call attempt). Partners with the service-centre module also get a real workorder overview strip — Today/Week/Month/Year volume, Open, Overdue (open + past its own slaDate 'Promised Delivery' field), Part Pending (In Progress + onHold), Repair Completed, Closed This Month, Cancelled — computed from the same BusinessRecord store — see getServiceCentreOverview in src/lib/analyticsData.ts. There is no technician/assignment concept in this app (by explicit design), so no per-technician breakdown.",
  sourceFile: "src/app/partner/[partnerId]/dashboard/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function PartnerDashboardPage({ params }: { params: { partnerId: string } }) {
  const enabledSlugs = await getVisibleModuleSlugs(params.partnerId);
  const modules = await getVisibleModules(params.partnerId);
  // getVisibleModules() silently drops any slug getModule() can't resolve
  // (e.g. a stale/renamed module still referenced by a PartnerType or
  // access key) — so `modules` can be SHORTER than `enabledSlugs`, and
  // indexing both by the same position (modules[i]) mislabels or throws
  // once they diverge. Look modules up by slug instead, so a dropped
  // module never shifts anything else.
  const moduleBySlug = new Map(modules.map((m) => [m.slug, m]));
  const hasServiceCentre = enabledSlugs.includes("service-centre");
  const hasTelecalling = enabledSlugs.includes("telecalling");
  const [stats, scOverview, revenueBreakdown, callsThisMonth] = await Promise.all([
    Promise.all(enabledSlugs.map((slug) => computeModuleStat(params.partnerId, slug))),
    hasServiceCentre ? getServiceCentreOverview(params.partnerId) : Promise.resolve(null),
    getRevenueBreakdown(params.partnerId),
    hasTelecalling ? getCallsThisMonth(params.partnerId) : Promise.resolve(null),
  ]);

  return (
    <AppShell topbarTitle="Dashboard">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Dashboard</h1>
        <p className="mt-1 max-w-[65ch] text-sm text-text-muted">
          Composed from the modules you currently have access to —{" "}
          {modules.length > 0 ? modules.map((m) => m?.label).join(", ") : "none yet"}. This list
          changes automatically as access is granted or withdrawn.
        </p>

        <div className="mt-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Revenue Collected
          </div>
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link href={`/partner/${params.partnerId}/billing`}>
              <DashboardWidget label="Today" value={formatCurrencyINR(revenueBreakdown.today)} />
            </Link>
            <Link href={`/partner/${params.partnerId}/billing`}>
              <DashboardWidget label="This Week" value={formatCurrencyINR(revenueBreakdown.thisWeek)} />
            </Link>
            <Link href={`/partner/${params.partnerId}/billing`}>
              <DashboardWidget label="This Month" value={formatCurrencyINR(revenueBreakdown.thisMonth)} neon />
            </Link>
            <Link href={`/partner/${params.partnerId}/billing`}>
              <DashboardWidget label="This Year" value={formatCurrencyINR(revenueBreakdown.thisYear)} />
            </Link>
          </div>
        </div>

        {hasTelecalling && callsThisMonth !== null && (
          <div className="mt-6">
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Telecalling
            </div>
            <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Link href={`/partner/${params.partnerId}/telecalling`}>
                <DashboardWidget label="Calls This Month" value={String(callsThisMonth)} />
              </Link>
            </div>
          </div>
        )}

        {scOverview && (
          <div className="mt-6">
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Service Centre — Workorder Overview
            </div>
            <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Link href={`/partner/${params.partnerId}/service-centre`}>
                <DashboardWidget label="Workorders Today" value={String(scOverview.workordersToday)} />
              </Link>
              <Link href={`/partner/${params.partnerId}/service-centre`}>
                <DashboardWidget label="Workorders This Week" value={String(scOverview.workordersThisWeek)} />
              </Link>
              <Link href={`/partner/${params.partnerId}/service-centre`}>
                <DashboardWidget label="Workorders This Month" value={String(scOverview.workordersThisMonth)} />
              </Link>
              <Link href={`/partner/${params.partnerId}/service-centre`}>
                <DashboardWidget label="Workorders This Year" value={String(scOverview.workordersThisYear)} />
              </Link>
              <Link href={`/partner/${params.partnerId}/service-centre`}>
                <DashboardWidget label="Open Workorders" value={String(scOverview.openWorkorders)} />
              </Link>
              <Link href={`/partner/${params.partnerId}/service-centre`}>
                <DashboardWidget label="Overdue" value={String(scOverview.overdueWorkorders)} />
              </Link>
              <Link href={`/partner/${params.partnerId}/service-centre`}>
                <DashboardWidget label="Part Pending" value={String(scOverview.partPendingWorkorders)} />
              </Link>
              <Link href={`/partner/${params.partnerId}/service-centre`}>
                <DashboardWidget label="Repair Completed" value={String(scOverview.repairCompletedWorkorders)} />
              </Link>
              <Link href={`/partner/${params.partnerId}/service-centre`}>
                <DashboardWidget label="Closed This Month" value={String(scOverview.closedThisMonth)} />
              </Link>
              <Link href={`/partner/${params.partnerId}/service-centre`}>
                <DashboardWidget label="Cancelled" value={String(scOverview.cancelledWorkorders)} />
              </Link>
            </div>
          </div>
        )}

        <div className="mt-6">
          {scOverview && (
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              All Enabled Modules
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {enabledSlugs.map((slug, i) => {
              const mod = moduleBySlug.get(slug);
              const stat = stats[i];
              const value =
                stat.currencySum !== undefined
                  ? formatCurrencyINR(stat.currencySum)
                  : String(stat.count);
              return (
                <DashboardWidget
                  key={slug}
                  label={mod?.label ?? slug}
                  value={value}
                  trend={{ direction: "up", label: `${stat.count} record${stat.count === 1 ? "" : "s"}` }}
                  neon={!scOverview && i === 0}
                />
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
