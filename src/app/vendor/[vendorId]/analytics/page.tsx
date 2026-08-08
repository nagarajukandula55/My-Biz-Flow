import { AppShell } from "@/components/AppShell";
import { DashboardWidget } from "@/components/DashboardWidget";
import { DataTable } from "@/components/DataTable";
import { LineChartCard, BarChartCard, PieChartCard } from "@/components/charts";
import { getDemoEnabledModules } from "@/lib/designer/modules";
import { buildVendorAdminNavGroups } from "@/lib/designer/vendorAdminNav";
import { formatCurrencyINR } from "@/lib/format";
import {
  revenueTrend,
  getRecordsByModuleBarData,
  workorderStatusBreakdown,
  recentActivityColumns,
  recentActivityRows,
} from "@/lib/sample-data/analytics";
import { getAccessibleModuleSlugs, getDemoViewerRole, filterByAccessibleModules } from "@/lib/rbac";
import { registerPage } from "@/lib/designer/registry";

registerPage({
  id: "platform.analytics",
  moduleSlug: "platform",
  title: "Analytics",
  path: "/vendor/[vendorId]/analytics",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [
    { key: "revenue-trend-chart", label: "Revenue trend (line chart)" },
    { key: "records-by-module-chart", label: "Records by module (bar chart)" },
    { key: "status-breakdown-chart", label: "Status breakdown (pie chart)" },
    { key: "activity-table", label: "Recent activity table" },
    { key: "summary-widgets", label: "Summary stat row" },
  ],
  explanation:
    "A common page every Vendor has (like Settings) — same structure, different data. This is also the Designer's showcase for every chart type: line (trend), bar (comparison), pie (composition), a DataTable (raw rows), and DashboardWidget summaries all together. Charts are filtered through filterByAccessibleModules() using the viewer's Role -> Access Groups -> module chain (src/lib/rbac.ts) — the filtering logic is real, its input (getDemoViewerRole) is a stopgap until vendor-user sessions exist.",
  sourceFile: "src/app/vendor/[vendorId]/analytics/page.tsx",
});

type ScopedChart = { id: string; moduleSlug: string };
const SCOPED_CHARTS: ScopedChart[] = [
  { id: "revenue-trend", moduleSlug: "billing" },
  { id: "status-breakdown", moduleSlug: "service-centre" },
];

export default function AnalyticsPage({ params }: { params: { vendorId: string } }) {
  const enabledModules = getDemoEnabledModules(params.vendorId);
  const viewerRole = getDemoViewerRole();
  const accessibleModules = getAccessibleModuleSlugs(viewerRole);

  const visibleScopedCharts = filterByAccessibleModules(SCOPED_CHARTS, accessibleModules);
  const showRevenueTrend = visibleScopedCharts.some((c) => c.id === "revenue-trend");
  const showStatusBreakdown = visibleScopedCharts.some((c) => c.id === "status-breakdown");

  const barData = getRecordsByModuleBarData(
    enabledModules.filter((slug) => accessibleModules.includes(slug))
  );

  const totalRevenue = revenueTrend.reduce((sum, p) => sum + p.y, 0);

  return (
    <AppShell navGroups={buildVendorAdminNavGroups("analytics")} topbarTitle="Analytics">
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">Analytics</h1>
        <p className="mt-1 max-w-[65ch] text-sm text-text-muted">
          Viewing as <strong className="text-text">{viewerRole}</strong> — charts scoped to a
          module outside this role&apos;s Access Groups are hidden, not just disabled.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <DashboardWidget label="7-day revenue" value={formatCurrencyINR(totalRevenue)} neon />
          <DashboardWidget label="Enabled modules" value={String(enabledModules.length)} />
          <DashboardWidget label="Accessible to this role" value={String(accessibleModules.length)} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {showRevenueTrend && (
            <LineChartCard
              title="Revenue trend"
              subtitle="Last 7 days — Billing"
              data={revenueTrend}
              valueFormatter={(v) => formatCurrencyINR(v)}
            />
          )}
          <BarChartCard
            title="Records by module"
            subtitle="Enabled modules this role can see"
            data={barData}
          />
          {showStatusBreakdown && (
            <PieChartCard
              title="Workorder status breakdown"
              subtitle="Service Centre"
              data={workorderStatusBreakdown}
            />
          )}
        </div>

        <div className="mt-6">
          <div className="mb-2 text-sm font-semibold text-text">Recent activity</div>
          <DataTable columns={recentActivityColumns} rows={recentActivityRows} />
        </div>
      </div>
    </AppShell>
  );
}
