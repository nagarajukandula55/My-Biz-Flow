import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { renderTierGate } from "@/lib/pageTierGate";
import { formatCurrencyINR } from "@/lib/format";
import { getProfitAndLoss } from "@/lib/accounting";

registerPage({
  id: "accounting.reports.profit-loss",
  moduleSlug: "accounting",
  title: "Accounting — Profit & Loss",
  path: "/partner/[partnerId]/accounting/reports/profit-loss",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Read-only Profit & Loss over a date range — sums Income and Expense account types, Net Profit/Loss = Income − Expense. Pro+ gated.",
  sourceFile: "src/app/partner/[partnerId]/accounting/reports/profit-loss/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ProfitLossPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams?: { from?: string; to?: string };
}) {
  const tierGate = await renderTierGate(params.partnerId, "accounting.reports.profit-loss", "Profit & Loss");
  if (tierGate) return <AppShell topbarTitle="Profit & Loss">{tierGate}</AppShell>;

  const { from, to } = searchParams ?? {};
  const report = await getProfitAndLoss(params.partnerId, {
    from: from ? new Date(`${from}T00:00:00`) : undefined,
    to: to ? new Date(`${to}T23:59:59`) : undefined,
  });
  const clearHref = `/partner/${params.partnerId}/accounting/reports/profit-loss`;

  return (
    <AppShell topbarTitle="Profit & Loss">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Profit &amp; Loss</h1>
        <p className="mt-1 text-xs text-text-muted">Income and Expense accounts over the selected date range.</p>

        <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">From</span>
            <input type="date" name="from" defaultValue={from ?? ""} className="rounded-md border border-border bg-bg px-3 py-2 text-sm font-mono text-text outline-none focus:border-teal" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">To</span>
            <input type="date" name="to" defaultValue={to ?? ""} className="rounded-md border border-border bg-bg px-3 py-2 text-sm font-mono text-text outline-none focus:border-teal" />
          </label>
          <button type="submit" className="btn-outline">Apply</button>
          {(from || to) && <a href={clearHref} className="btn-outline">Clear</a>}
        </form>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-2 text-sm font-semibold text-text">Income</div>
            <div className="overflow-x-auto rounded-lg border border-border bg-bg-raised">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {report.incomeRows.filter((r) => r.totalCredit - r.totalDebit !== 0).map((r) => (
                    <tr key={r.accountId} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-2 text-text">{r.accountName}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-text">{formatCurrencyINR((r.totalCredit - r.totalDebit) / 100)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border font-semibold">
                    <td className="px-3 py-2.5 text-text">Total Income</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-success">{formatCurrencyINR(report.totalIncome / 100)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold text-text">Expense</div>
            <div className="overflow-x-auto rounded-lg border border-border bg-bg-raised">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {report.expenseRows.filter((r) => r.totalDebit - r.totalCredit !== 0).map((r) => (
                    <tr key={r.accountId} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-2 text-text">{r.accountName}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-text">{formatCurrencyINR((r.totalDebit - r.totalCredit) / 100)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border font-semibold">
                    <td className="px-3 py-2.5 text-text">Total Expense</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-danger">{formatCurrencyINR(report.totalExpense / 100)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-border bg-bg-raised p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Net Profit / Loss</div>
          <div className={`mt-2 font-mono text-2xl font-bold tabular-nums ${report.netProfit >= 0 ? "text-success" : "text-danger"}`}>
            {formatCurrencyINR(report.netProfit / 100)}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
