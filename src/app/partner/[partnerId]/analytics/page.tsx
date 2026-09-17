import { AppShell } from "@/components/AppShell";
import { DashboardWidget } from "@/components/DashboardWidget";
import { DataTable } from "@/components/DataTable";
import { LineChartCard, BarChartCard, PieChartCard, PeriodComparisonCard } from "@/components/charts";
import { ComboTrendCard } from "@/components/charts/ComboTrendCard";
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
  getAnalyticsSummary,
  getSixMonthTrend,
  getTopBrandsByWorkorderCount,
  getAverageTat,
} from "@/lib/analyticsData";
import { formatTatHours } from "@/lib/sample-data/service-centre";
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
    { key: "summary-cards", label: "Revenue/Invoices/Workorders summary cards" },
    { key: "six-month-trend-chart", label: "Revenue & Workorders trend (last 6 months, combo line chart)" },
    { key: "top-brands-chart", label: "Top brands by workorder count (bar chart, Service Centre)" },
    { key: "average-tat-card", label: "Average turnaround time — closed workorders (Service Centre)" },
  ],
  explanation:
    "A common page every Partner has (like Settings) — same structure, different data. This is also the Designer's showcase for every chart type: line (trend), bar (comparison), pie (composition), a DataTable (raw rows), and DashboardWidget summaries all together. Modules are first narrowed to this partner's active access keys (getVisibleModuleSlugs, src/lib/designer/entitlements.ts), then charts are filtered again through filterByAccessibleModules() using the viewer's Role -> Access Groups -> module chain (src/lib/rbac.ts) — the filtering logic is real, its input (getDemoViewerRole) is a stopgap until partner-user sessions exist. The top summary row (Total Revenue, This Month, Invoices, Total/Open/Closed Workorders — getAnalyticsSummary in analyticsData.ts) reuses computeDisplayStatus() from sample-data/service-centre.ts for its Open/Closed Workorder counts — the SAME milestone computation the Workorders list page's own stat cards use — so the two pages can never disagree. Also includes a 6-month combined Revenue+Workorders trend line chart (getSixMonthTrend), a Daily/Weekly/Monthly/Yearly year-on-date comparison (this period vs. the same period one calendar year earlier, for both revenue and workorder volume — getPeriodComparison in analyticsData.ts), plus Revenue-by-Source (grouped by Billing paymentMode, the one real cross-record field this app has for 'where the money came in through') and Invoice Status breakdown pies.",
  sourceFile: "src/app/partner/[partnerId]/analytics/page.tsx",
});

// Partner-facing page — a partner has no reason to see internal role/access-group
// plumbing ("Enabled modules" / "Accessible to this role" counts). Hidden the same
// way Settings' module grid was (SHOW_ENABLED_MODULES there): the underlying
// getVisibleModuleSlugs/getAccessibleModuleSlugs data and the chart-scoping logic
// that depends on it are untouched — this only stops rendering the two widgets.
const SHOW_ROLE_ACCESS_WIDGETS = false;

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
    summary,
    sixMonthTrend,
  ] = await Promise.all([
    getRecordsByModuleBarData(params.partnerId, visibleModules),
    getRevenueTrend(params.partnerId),
    getWorkorderStatusBreakdown(params.partnerId),
    getRecentActivity(params.partnerId, visibleModules),
    showRevenueBySource ? getRevenueBySource(params.partnerId) : Promise.resolve([]),
    showInvoiceStatus ? getInvoiceStatusBreakdown(params.partnerId) : Promise.resolve([]),
    showPeriodComparison ? getPeriodComparison(params.partnerId) : Promise.resolve(null),
    getAnalyticsSummary(params.partnerId),
    getSixMonthTrend(params.partnerId),
  ]);

  const showServiceCentreReports = visibleModules.includes("service-centre");
  const [topBrands, averageTat] = await Promise.all([
    showServiceCentreReports ? getTopBrandsByWorkorderCount(params.partnerId) : Promise.resolve([]),
    showServiceCentreReports ? getAverageTat(params.partnerId) : Promise.resolve({ closedCount: 0, avgHours: undefined }),
  ]);

  const thisMonthLabel = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <AppShell topbarTitle="Analytics">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Analytics</h1>
        <p className="mt-1 max-w-[65ch] text-sm text-text-muted">
          Viewing as <strong className="text-text">{viewerRole}</strong> — charts scoped to a
          module outside this role&apos;s Access Groups are hidden, not just disabled.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <DashboardWidget
            label="Total Revenue"
            value={formatCurrencyINR(summary.totalRevenue)}
            trend={{ direction: "up", label: `${summary.paidInvoiceCount} paid invoice${summary.paidInvoiceCount === 1 ? "" : "s"}` }}
            neon
          />
          <DashboardWidget
            label={`This Month (${thisMonthLabel})`}
            value={formatCurrencyINR(summary.thisMonthRevenue)}
            trend={{ direction: "up", label: `${summary.thisMonthInvoiceCount} invoice${summary.thisMonthInvoiceCount === 1 ? "" : "s"}` }}
          />
          <DashboardWidget
            label="Invoices"
            value={String(summary.totalInvoices)}
            trend={{ direction: "up", label: "all statuses" }}
          />
          <DashboardWidget label="Total Workorders" value={String(summary.totalWorkorders)} />
          <DashboardWidget label="Open Workorders" value={String(summary.openWorkorders)} />
          <DashboardWidget label="Closed Workorders" value={String(summary.closedWorkorders)} />
        </div>

        {SHOW_ROLE_ACCESS_WIDGETS && (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DashboardWidget label="Enabled modules" value={String(enabledModules.length)} />
            <DashboardWidget label="Accessible to this role" value={String(accessibleModules.length)} />
          </div>
        )}

        <div className="mt-6">
          <ComboTrendCard
            title="Revenue & Workorders Trend (last 6 months)"
            subtitle="Billing revenue collected vs. workorders created, by calendar month"
            data={sixMonthTrend}
          />
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
          {showRevenueBySource && (
            <PieChartCard
              title="Revenue by source"
              subtitle="Collected Billing revenue, by payment mode"
              data={revenueBySource}
            />
          )}
          {showInvoiceStatus && (
            <PieChartCard
              title="Invoice status breakdown"
              subtitle="All Billing records, by payment status"
              data={invoiceStatusBreakdown}
            />
          )}
        </div>

        {showServiceCentreReports && (
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BarChartCard
              title="Top brands by workorder count"
              subtitle="Service Centre — data.brandName, blank brand excluded"
              data={topBrands}
            />
            <div className="rounded-lg border border-border bg-bg-raised p-5">
              <div className="text-sm font-semibold text-text">Average turnaround time (TAT)</div>
              <div className="mt-0.5 text-xs text-text-muted">
                Closed workorders only — intake to Closed, same computation as the per-row TAT badge
              </div>
              <div className="mt-4 flex h-[240px] flex-col items-center justify-center">
                <div className="font-display text-4xl font-bold text-text">
                  {formatTatHours(averageTat.avgHours)}
                </div>
                <div className="mt-2 text-sm text-text-muted">
                  across {averageTat.closedCount} closed workorder{averageTat.closedCount === 1 ? "" : "s"}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <div className="mb-2 text-sm font-semibold text-text">Recent activity</div>
          <DataTable columns={recentActivityColumns} rows={recentActivityRows} />
        </div>
      </div>
    </AppShell>
  );
}
