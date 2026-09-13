import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { DashboardWidget } from "@/components/DashboardWidget";
import { getVisibleModuleSlugs, getVisibleModules } from "@/lib/designer/entitlements";
import { computeModuleStat, getServiceCentreOverview } from "@/lib/analyticsData";
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
    { key: "service-centre-overview", label: "Service Centre overview strip (period/open/technician cards)" },
  ],
  explanation:
    "Not one hardcoded dashboard and not 21 separate per-module dashboards — this page is dynamically composed from whichever modules this partner is BOTH enabled for and holds an active access key for (getVisibleModuleSlugs, src/lib/designer/entitlements.ts), generating one DashboardWidget per module via a generic aggregation helper (computeModuleStat) rather than per-module logic repeated 21 times. A partner whose access key for a module gets revoked loses that widget immediately, independent of their plan. Partners with the service-centre module also get a real workorder overview strip (Today/Week/Month/Year volume, Open/Closed-this-month, revenue-this-month from billing, technician workload) computed from the same BusinessRecord store — see getServiceCentreOverview in src/lib/analyticsData.ts.",
  sourceFile: "src/app/partner/[partnerId]/dashboard/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function PartnerDashboardPage({ params }: { params: { partnerId: string } }) {
  const enabledSlugs = await getVisibleModuleSlugs(params.partnerId);
  const modules = await getVisibleModules(params.partnerId);
  const hasServiceCentre = enabledSlugs.includes("service-centre");
  const [stats, scOverview] = await Promise.all([
    Promise.all(enabledSlugs.map((slug) => computeModuleStat(params.partnerId, slug))),
    hasServiceCentre ? getServiceCentreOverview(params.partnerId) : Promise.resolve(null),
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
                <DashboardWidget
                  label="Open Workorders"
                  value={String(scOverview.openWorkorders)}
                  trend={{ direction: "up", label: `${scOverview.technicianWorkload.length} technician(s) assigned` }}
                />
              </Link>
              <Link href={`/partner/${params.partnerId}/service-centre`}>
                <DashboardWidget label="Closed This Month" value={String(scOverview.closedThisMonth)} />
              </Link>
              <Link href={`/partner/${params.partnerId}/billing`}>
                <DashboardWidget label="Revenue This Month" value={formatCurrencyINR(scOverview.revenueThisMonth)} neon />
              </Link>
            </div>

            {scOverview.technicianWorkload.length > 0 && (
              <div className="mt-4 rounded-lg border border-border bg-bg-raised p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Technician Workload (open jobs)
                </div>
                <div className="mt-3 space-y-2">
                  {scOverview.technicianWorkload.map((t) => (
                    <div key={t.technician} className="flex items-center justify-between text-sm">
                      <span className="text-text">{t.technician}</span>
                      <span className="font-mono font-semibold text-text">{t.open}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              const mod = modules[i];
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
