import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { renderTierGate } from "@/lib/pageTierGate";
import { formatCurrencyINR } from "@/lib/format";
import { getBalanceSheet } from "@/lib/accounting";

registerPage({
  id: "accounting.reports.balance-sheet",
  moduleSlug: "accounting",
  title: "Accounting — Balance Sheet",
  path: "/partner/[partnerId]/accounting/reports/balance-sheet",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Read-only Balance Sheet as of a given date — sums Asset/Liability/Equity account types with an Assets = Liabilities + Equity check. Pro+ gated.",
  sourceFile: "src/app/partner/[partnerId]/accounting/reports/balance-sheet/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function BalanceSheetPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams?: { asOf?: string };
}) {
  const tierGate = await renderTierGate(params.partnerId, "accounting.reports.balance-sheet", "Balance Sheet");
  if (tierGate) return <AppShell topbarTitle="Balance Sheet">{tierGate}</AppShell>;

  const asOfStr = searchParams?.asOf || new Date().toISOString().slice(0, 10);
  const asOf = new Date(`${asOfStr}T23:59:59`);
  const sheet = await getBalanceSheet(params.partnerId, asOf);
  const balanced = sheet.totalAssets === sheet.totalLiabilities + sheet.totalEquity;

  return (
    <AppShell topbarTitle="Balance Sheet">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Balance Sheet</h1>
        <p className="mt-1 text-xs text-text-muted">Asset/Liability/Equity accounts as of the selected date.</p>

        <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">As Of</span>
            <input type="date" name="asOf" defaultValue={asOfStr} className="rounded-md border border-border bg-bg px-3 py-2 text-sm font-mono text-text outline-none focus:border-teal" />
          </label>
          <button type="submit" className="btn-outline">Apply</button>
        </form>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-2 text-sm font-semibold text-text">Assets</div>
            <div className="overflow-x-auto rounded-lg border border-border bg-bg-raised">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {sheet.assetRows.filter((r) => r.totalDebit - r.totalCredit !== 0).map((r) => (
                    <tr key={r.accountId} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-2 text-text">{r.accountName}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-text">{formatCurrencyINR((r.totalDebit - r.totalCredit) / 100)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border font-semibold">
                    <td className="px-3 py-2.5 text-text">Total Assets</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-text">{formatCurrencyINR(sheet.totalAssets / 100)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold text-text">Liabilities &amp; Equity</div>
            <div className="overflow-x-auto rounded-lg border border-border bg-bg-raised">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {sheet.liabilityRows.filter((r) => r.totalCredit - r.totalDebit !== 0).map((r) => (
                    <tr key={r.accountId} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-2 text-text">{r.accountName}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-text">{formatCurrencyINR((r.totalCredit - r.totalDebit) / 100)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-border font-semibold">
                    <td className="px-3 py-2 text-text">Total Liabilities</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-text">{formatCurrencyINR(sheet.totalLiabilities / 100)}</td>
                  </tr>
                  {sheet.equityRows.filter((r) => r.totalCredit - r.totalDebit !== 0).map((r) => (
                    <tr key={r.accountId} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-2 text-text">{r.accountName}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-text">{formatCurrencyINR((r.totalCredit - r.totalDebit) / 100)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border font-semibold">
                    <td className="px-3 py-2.5 text-text">Total Liabilities + Equity</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-text">
                      {formatCurrencyINR((sheet.totalLiabilities + sheet.totalEquity) / 100)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <p className={`mt-4 text-sm font-semibold ${balanced ? "text-success" : "text-danger"}`}>
          {balanced ? "Balance check: Assets = Liabilities + Equity." : "Balance check FAILED: Assets does not equal Liabilities + Equity."}
        </p>
      </div>
    </AppShell>
  );
}
