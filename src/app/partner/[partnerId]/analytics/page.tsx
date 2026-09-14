import { AppShell } from "@/components/AppShell";
import { DashboardWidget } from "@/components/DashboardWidget";
import { DataTable } from "@/components/DataTable";
import { LineChartCard, BarChartCard, PieChartCard, PeriodComparisonCard } from "@/components/charts";
import { getVisibleModuleSlugs } from "@/lib/designer/entitlements";
import { formatCurrencyINR } from "@/lib/format";
import {
  getRevenueTrend,
  getRecordsByModuleBarData,
  getWorkorderStatusBreakdown,
  recentActivityColumns,
  getRecentActivity,
  getPeriodComparison,
  getRevenueBySource,
  getInvoiceStatusBreakdown,
} from "@/lib/analyticsData";
import { getAccessibleModuleSlugs, getDemoViewerRole, filterByAccessibleModules } from "@/lib/rbac";
import { registerPage } from "@/lib/designer/registry";

registerPage({
  id: "platform.analytics",
  moduleSlug: "platform",
  title: "Analytics",
  path: "/partner/[partnerId]/analytics",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [
    { key: "revenue-trend-chart", label: "Revenue trend (line chart)" },
    { key: "records-by-module-chart", label: "Records by module (bar chart)" },
    { key: "status-breakdown-chart", label: "Status breakdown (pie chart)" },
    { key: "period-comparison-chart", label: "Daily/Weekly/Monthly/Yearly year-on-date comparison" },
    { key: "revenue-by-source-chart", label: "Revenue by source (pie chart)" },
    { key: "invoice-status-chart", label: "Invoice status breakdown (pie chart)" },
    { key: "activity-table", label: "Recent activity table" },
    { key: "summary-widgets", label: "Summary stat row" },
  ],
  explanation:
    "A common page every Partner has (like Settings) — same structure, different data. This is also the Designer's showcase for every chart type: line (trend), bar (comparison), pie (composition), a DataTable (raw rows), and DashboardWidget summaries all together. Modules are first narrowed to this partner's active access keys (getVisibleModuleSlugs, src/lib/designer/entitlements.ts), then charts are filtered again through filterByAccessibleModules() using the viewer's Role -> Access Groups -> module chain (src/lib/rbac.ts) — the filtering logic is real, its input (getDemoViewerRole) is a stopgap until partner-user sessions exist. Also includes a Daily/Weekly/Monthly/Yearly year-on-date comparison (this period vs. the same period one calendar year earlier, for both revenue and workorder volume — getPeriodComparison in analyticsData.ts) plus Revenue-by-Source (grouped by Billing paymentMode, the one real cross-record field this app has for 'where the money came in through') and Invoice Status breakdown pies.",
  sourceFile: "src/app/partner/[partnerId]/analytics/page.tsx",
});

type ScopedChart = { id: string; moduleSlug: string };
const SCOPED_CHARTS: ScopedChart[] = [
  { id: "revenue-trend", moduleSlug: "billing" },
  { id: "status-breakdown", moduleSlug: "service-centre" },
  { id: "revenue-by-source", moduleSlug: "billing" },
  { id: "invoice-status", moduleSlug: "billing" },
  { id: "period-comparison", moduleSlug: "billing" },
];

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ params }: { params: { partnerId: string } }) {
  const enabledModules = await getVisibleModuleSlugs(params.partnerId);
  const viewerRole = getDemoViewerRole();
  const accessibleModules = await getAccessibleModuleSlugs(viewerRole);

  const visibleScopedCharts = filterByAccessibleModules(SCOPED_CHARTS, accessibleModules);
  const showRevenueTrend = visibleScopedCharts.some((c) => c.id === "revenue-trend");
  const showStatusBreakdown = visibleScopedCharts.some((c) => c.id === "status-breakdown");
  const showRevenueBySource = visibleScopedCharts.some((c) => c.id === "revenue-by-source");
  const showInvoiceStatus = visibleScopedCharts.some((c) => c.id === "invoice-status");
  const showPeriodComparison = visibleScopedCharts.some((c) => c.id === "period-comparison");

  const visibleModules = enabledModules.filter((slug) => accessibleModules.includes(slug));
  const [
    barData,
    revenueTrend,
    workorderStatusBreakdown,
    recentActivityRows,
    revenueBySource,
    invoiceStatusBreakdown,
    periodComparison,
  ] = await Promise.all([
    getRecordsByModuleBarData(params.partnerId, visibleModules),
    getRevenueTrend(params.partnerId),
    getWorkorderStatusBreakdown(params.partnerId),
    getRecentActivity(params.partnerId, visibleModules),
    showRevenueBySource ? getRevenueBySource(params.partnerId) : Promise.resolve([]),
    showInvoiceStatus ? getInvoiceStatusBreakdown(params.partnerId) : Promise.resolve([]),
    showPeriodComparison ? getPeriodComparison(params.partnerId) : Promise.resolve(null),
  ]);

  const totalRevenue = revenueTrend.reduce((sum, p) => sum + p.y, 0);

  return (
    <AppShell topbarTitle="Analytics">
      <div>
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

        {showPeriodComparison && periodComparison && (
          <div className="mt-6">
            <PeriodComparisonCard data={periodComparison} />
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {showRevenueTrend && (
            <LineChartCard
              title="Revenue trend"
              subtitle="Last 7 days — Billing"
              data={revenueTrend}
              format="currency"
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
          {showRevenueBySource && revenueBySource.length > 0 && (
            <PieChartCard
              title="Revenue by source"
              subtitle="Collected Billing revenue, by payment mode"
              data={revenueBySource}
            />
          )}
          {showInvoiceStatus && invoiceStatusBreakdown.length > 0 && (
            <PieChartCard
              title="Invoice status breakdown"
              subtitle="All Billing records, by payment status"
              data={invoiceStatusBreakdown}
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
