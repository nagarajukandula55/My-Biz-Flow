import { AppShell } from "@/components/AppShell";
import { DashboardWidget } from "@/components/DashboardWidget";
import { LineChartCard, BarChartCard, PieChartCard, PeriodComparisonCard } from "@/components/charts";
import { ComboTrendCard } from "@/components/charts/ComboTrendCard";
import { getVisibleModuleSlugs } from "@/lib/designer/entitlements";
import { formatCurrencyINR } from "@/lib/format";
import {
  getRevenueTrend,
  getWorkorderStatusBreakdown,
  getPeriodComparison,
  getRevenueBySource,
  getInvoiceStatusBreakdown,
  getAnalyticsSummary,
  getSixMonthTrend,
  getTopBrandsByWorkorderCount,
  getAverageTat,
} from "@/lib/analyticsData";
import { formatTatHours } from "@/lib/sample-data/service-centre";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { redirect } from "next/navigation";
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
    { key: "status-breakdown-chart", label: "Status breakdown (pie chart)" },
    { key: "period-comparison-chart", label: "Daily/Weekly/Monthly/Yearly year-on-date comparison" },
    { key: "revenue-by-source-chart", label: "Revenue by source (pie chart)" },
    { key: "invoice-status-chart", label: "Invoice status breakdown (pie chart)" },
    { key: "summary-widgets", label: "Summary stat row" },
    { key: "summary-cards", label: "Revenue/Invoices/Workorders summary cards" },
    { key: "six-month-trend-chart", label: "Revenue & Workorders trend (last 6 months, combo line chart)" },
    { key: "top-brands-chart", label: "Top brands by workorder count (bar chart, Service Centre)" },
    { key: "average-tat-card", label: "Average turnaround time — closed workorders (Service Centre)" },
  ],
  explanation: "Partner analytics uses the authenticated owner or administrator and active module entitlements. Queries and charts are limited to enabled modules. Combined reports require both Billing and Service Centre.",
  sourceFile: "src/app/partner/[partnerId]/analytics/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ params }: { params: { partnerId: string } }) {
  const session = await requirePartnerSessionForPage(params.partnerId);
  if (session.kind === "staff") redirect(`/partner/${params.partnerId}/telecalling/queue`);
  const visibleModules = await getVisibleModuleSlugs(params.partnerId);
  const showBilling = visibleModules.includes("billing");
  const showServiceCentreReports = visibleModules.includes("service-centre");
  const showRevenueTrend = showBilling;
  const showStatusBreakdown = showServiceCentreReports;
  const showRevenueBySource = showBilling;
  const showInvoiceStatus = showBilling;
  const showPeriodComparison = showBilling && showServiceCentreReports;
  const [
    revenueTrend,
    workorderStatusBreakdown,
    revenueBySource,
    invoiceStatusBreakdown,
    periodComparison,
    summary,
    sixMonthTrend,
  ] = await Promise.all([
    showRevenueTrend ? getRevenueTrend(params.partnerId) : Promise.resolve([]),
    showStatusBreakdown ? getWorkorderStatusBreakdown(params.partnerId) : Promise.resolve([]),
    showRevenueBySource ? getRevenueBySource(params.partnerId) : Promise.resolve([]),
    showInvoiceStatus ? getInvoiceStatusBreakdown(params.partnerId) : Promise.resolve([]),
    showPeriodComparison ? getPeriodComparison(params.partnerId) : Promise.resolve(null),
    getAnalyticsSummary(params.partnerId, visibleModules),
    showPeriodComparison ? getSixMonthTrend(params.partnerId) : Promise.resolve([]),
  ]);

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
          Reports for the modules enabled for your business.
        </p>

        {!showBilling && !showServiceCentreReports && <p className="mt-6 text-sm text-text-muted">Analytics reports are available for Billing and Service Centre. Your other modules remain available from the menu.</p>}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {showBilling && <>
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
          </>}
          {showServiceCentreReports && <>
          <DashboardWidget label="Total Workorders" value={String(summary.totalWorkorders)} />
          <DashboardWidget label="Open Workorders" value={String(summary.openWorkorders)} />
          <DashboardWidget label="Closed Workorders" value={String(summary.closedWorkorders)} />
          </>}
        </div>

        {showPeriodComparison && <div className="mt-6">
          <ComboTrendCard
            title="Revenue & Workorders Trend (last 6 months)"
            subtitle="Billing revenue collected vs. workorders created, by calendar month"
            data={sixMonthTrend}
          />
        </div>}

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

      </div>
    </AppShell>
  );
}
