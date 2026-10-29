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
  getRevenueForecast,
} from "@/lib/analyticsData";
import { formatTatHours } from "@/lib/sample-data/service-centre";
import { getTelecallingAnalyticsSummary } from "@/lib/telecalling/analyticsData";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { redirect } from "next/navigation";
import Link from "next/link";
import { registerPage } from "@/lib/designer/registry";
import { ModuleWorkspace, ModuleSummarySections } from "@/components/ModuleWorkspace";
import { getFieldForceReport } from "@/lib/fieldForce/reportsData";
import { getWorkflowInsights } from "@/lib/workflowInsights";

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
    { key: "telecalling-section", label: "Leads/Calls summary, status breakdown, agent leaderboard (Telecalling)" },
  ],
  explanation: "Partner analytics uses the authenticated owner or administrator and active module entitlements. Queries and charts are limited to enabled modules. Combined reports require both Billing and Service Centre. A partner with Telecalling enabled also gets a Leads/Calls summary section (src/lib/telecalling/analyticsData.ts) — previously this page only ever queried Billing/Service Centre data, so a Telecalling-only partner saw a blank page.",
  sourceFile: "src/app/partner/[partnerId]/analytics/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ params }: { params: { partnerId: string } }) {
  const session = await requirePartnerSessionForPage(params.partnerId);
  if (session.kind === "staff") redirect(`/partner/${params.partnerId}/telecalling/queue`);
  const visibleModules = await getVisibleModuleSlugs(params.partnerId);
  // Existing Service Centre charts and calculations are deliberately unchanged.
  if (!["service-centre", "billing", "telecalling", "field-force"].some(slug => visibleModules.includes(slug))) return <ModuleWorkspace partnerId={params.partnerId} analytics />;
  const showBilling = visibleModules.includes("billing");
  const showServiceCentreReports = visibleModules.includes("service-centre");
  const showRevenueTrend = showBilling;
  const showStatusBreakdown = showServiceCentreReports;
  const showRevenueBySource = showBilling;
  const showInvoiceStatus = showBilling;
  const showPeriodComparison = showBilling && showServiceCentreReports;
  const showTelecalling = visibleModules.includes("telecalling");
  const showFieldForce = visibleModules.includes("field-force");
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

  const [topBrands, averageTat, telecalling] = await Promise.all([
    showServiceCentreReports ? getTopBrandsByWorkorderCount(params.partnerId) : Promise.resolve([]),
    showServiceCentreReports ? getAverageTat(params.partnerId) : Promise.resolve({ closedCount: 0, avgHours: undefined }),
    showTelecalling ? getTelecallingAnalyticsSummary(params.partnerId) : Promise.resolve(null),
  ]);
  const revenueForecast = showBilling ? await getRevenueForecast(params.partnerId) : null;
  const fieldForce = showFieldForce ? await getFieldForceReport(params.partnerId) : null;
  const workflowInsights = await getWorkflowInsights(params.partnerId);

  // IST, not server-local time (UTC in production) — matters right at
  // month-boundary midnight IST, where UTC is still the previous day.
  const thisMonthLabel = new Date().toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

  return (
    <AppShell topbarTitle="Analytics">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Analytics</h1>
        <p className="mt-1 max-w-[65ch] text-sm text-text-muted">
          Reports for the modules enabled for your business.
        </p>
        {workflowInsights.length > 0 && <section className="card mt-6 p-4"><h2 className="font-display text-lg font-bold text-text">Recommended actions</h2><div className="mt-3 space-y-2">{workflowInsights.map(item => <div key={item.key} className="flex flex-wrap items-center justify-between gap-3 rounded border border-border p-3"><div><div className="font-medium text-text">{item.title}</div><div className="text-sm text-text-muted">{item.reason}</div></div>{item.href && <Link className="text-sm text-teal hover:underline" href={`/partner/${params.partnerId}/${item.href}`}>Review</Link>}</div>)}</div><p className="mt-3 text-xs text-text-muted">Recommendations are explainable rules based on current records; they do not make accounting or stock changes automatically.</p></section>}
        {revenueForecast && <div className="card mt-6 p-4"><div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="font-display text-lg font-bold text-text">Revenue forecast</h2><span className="text-xs text-text-muted">Estimate from last {revenueForecast.lookbackDays} days</span></div><div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3"><DashboardWidget label="Estimated next 30 days" value={formatCurrencyINR(revenueForecast.next30Days)} /><DashboardWidget label="Average daily invoiced" value={formatCurrencyINR(revenueForecast.averageDaily)} /><DashboardWidget label="Collection rate" value={`${revenueForecast.collectionRate}%`} /></div><p className="mt-3 text-xs text-text-muted">This is a planning estimate, not an accounting balance or guaranteed forecast.</p></div>}

        {!showBilling && !showServiceCentreReports && !showTelecalling && !showFieldForce && <p className="mt-6 text-sm text-text-muted">Analytics reports are available for enabled modules.</p>}
        {fieldForce && <div className="mt-6"><h2 className="font-display text-lg font-bold text-text">Field Force</h2><div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"><DashboardWidget label="Bookings" value={String(fieldForce.totalBookings)} /><DashboardWidget label="Assigned" value={String(fieldForce.assignedBookings)} /><DashboardWidget label="Completed" value={String(fieldForce.completedBookings)} /><DashboardWidget label="Available Providers" value={`${fieldForce.availableProviderCount}/${fieldForce.providerCount}`} /><DashboardWidget label="Verified Providers" value={`${fieldForce.verifiedProviderCount}/${fieldForce.providerCount}`} /><DashboardWidget label="Paid Value" value={formatCurrencyINR(fieldForce.paidValue)} /></div><p className="mt-3 text-sm text-text-muted"><Link href={`/partner/${params.partnerId}/field-force/reports`} className="text-teal hover:underline">Open full Field Force report</Link></p></div>}
        {fieldForce && <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2"><div className="card p-4"><h3 className="font-display text-sm font-bold text-text">Booking funnel</h3><ul className="mt-3 space-y-2 text-sm">{Object.entries(fieldForce.statusCounts).map(([status, count]) => <li key={status} className="flex items-center justify-between border-b border-border pb-1.5 last:border-b-0"><span className="text-text-muted">{status}</span><span className="font-semibold text-text tabular-nums">{count}</span></li>)}</ul></div><div className="card p-4"><h3 className="font-display text-sm font-bold text-text">Commercial and SLA health</h3><ul className="mt-3 space-y-2 text-sm"><li className="flex justify-between"><span className="text-text-muted">Gross value</span><span className="font-semibold text-text">{formatCurrencyINR(fieldForce.grossValue)}</span></li><li className="flex justify-between"><span className="text-text-muted">Paid value</span><span className="font-semibold text-text">{formatCurrencyINR(fieldForce.paidValue)}</span></li><li className="flex justify-between"><span className="text-text-muted">Companies with SLA</span><span className="font-semibold text-text">{fieldForce.companiesWithSla}</span></li><li className="flex justify-between"><span className="text-text-muted">Cancelled jobs</span><span className="font-semibold text-text">{fieldForce.cancelledBookings}</span></li></ul></div></div>}
        {!showServiceCentreReports && <ModuleSummarySections partnerId={params.partnerId} exclude={["billing", "telecalling"]} analytics />}

        {telecalling && (
          <div className="mt-6">
            <h2 className="font-display text-lg font-bold text-text">Telecalling</h2>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <DashboardWidget label="Total Leads" value={String(telecalling.totalLeads)} />
              <DashboardWidget label="Unassigned" value={String(telecalling.unassignedLeads)} neon={telecalling.unassignedLeads > 0} />
              <DashboardWidget label="Converted (Accepted)" value={String(telecalling.convertedLeads)} />
              <DashboardWidget label="Conversion Rate" value={`${telecalling.conversionRatePct}%`} trend={{ direction: "up", label: "of closed-out leads" }} />
              <DashboardWidget label="Calls Today" value={String(telecalling.callsToday)} />
              <DashboardWidget label="Calls (7 days)" value={String(telecalling.callsLast7Days)} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="card p-4">
                <h3 className="font-display text-sm font-bold text-text">Leads by Status</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {Object.entries(telecalling.byStatus).map(([status, count]) => (
                    <li key={status} className="flex items-center justify-between border-b border-border pb-1.5 last:border-b-0">
                      <span className="text-text-muted">{status}</span>
                      <span className="font-semibold text-text tabular-nums">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card p-4">
                <h3 className="font-display text-sm font-bold text-text">Agent Leaderboard (calls, last 7 days)</h3>
                {telecalling.agentLeaderboard.length === 0 ? (
                  <p className="mt-3 text-sm text-text-muted">No telecaller agents yet.</p>
                ) : (
                  <table className="mt-3 w-full text-sm">
                    <thead className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                      <tr>
                        <th className="pb-1.5 text-left">Agent</th>
                        <th className="pb-1.5 text-right">Calls</th>
                        <th className="pb-1.5 text-right">Leads Assigned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {telecalling.agentLeaderboard.map((a) => (
                        <tr key={a.agentId} className="border-t border-border">
                          <td className="py-1.5 text-text">{a.agentName}</td>
                          <td className="py-1.5 text-right tabular-nums text-text">{a.callCount}</td>
                          <td className="py-1.5 text-right tabular-nums text-text-muted">{a.leadCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
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
