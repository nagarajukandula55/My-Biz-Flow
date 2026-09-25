import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { renderTierGate } from "@/lib/pageTierGate";
import { formatCurrencyINR } from "@/lib/format";
import { getTrialBalance } from "@/lib/accounting";

registerPage({
  id: "accounting.reports.trial-balance",
  moduleSlug: "accounting",
  title: "Accounting — Trial Balance",
  path: "/partner/[partnerId]/accounting/reports/trial-balance",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Read-only, server-rendered Trial Balance — every ChartOfAccount's summed JournalLine debit/credit, optionally filtered by date range, with a total-debit-vs-total-credit footer check. Pro+ gated.",
  sourceFile: "src/app/partner/[partnerId]/accounting/reports/trial-balance/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function TrialBalancePage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams?: { from?: string; to?: string };
}) {
  const tierGate = await renderTierGate(params.partnerId, "accounting.reports.trial-balance", "Trial Balance");
  if (tierGate) return <AppShell topbarTitle="Trial Balance">{tierGate}</AppShell>;

  const { from, to } = searchParams ?? {};
  const rows = await getTrialBalance(params.partnerId, {
    from: from ? new Date(`${from}T00:00:00`) : undefined,
    to: to ? new Date(`${to}T23:59:59`) : undefined,
  });
  const nonZeroRows = rows.filter((r) => r.totalDebit !== 0 || r.totalCredit !== 0);
  const totalDebit = rows.reduce((s, r) => s + r.totalDebit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.totalCredit, 0);
  const balanced = totalDebit === totalCredit;
  const clearHref = `/partner/${params.partnerId}/accounting/reports/trial-balance`;

  return (
    <AppShell topbarTitle="Trial Balance">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Trial Balance</h1>
        <p className="mt-1 text-xs text-text-muted">Every account's summed debit/credit from posted Journal Entries.</p>

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

        <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-bg-raised">
          <table className="w-full min-w-[600px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-sunken text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                <th className="px-3 py-2.5">Code</th>
                <th className="px-3 py-2.5">Account</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5 text-right">Debit</th>
                <th className="px-3 py-2.5 text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {nonZeroRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-text-muted">
                    No posted activity for the selected filters.
                  </td>
                </tr>
              )}
              {nonZeroRows.map((r) => (
                <tr key={r.accountId} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2 font-mono text-xs text-text-muted">{r.accountCode}</td>
                  <td className="px-3 py-2 text-text">{r.accountName}</td>
                  <td className="px-3 py-2 text-text-muted">{r.accountType}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-text">{formatCurrencyINR(r.totalDebit / 100)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-text">{formatCurrencyINR(r.totalCredit / 100)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-semibold">
                <td colSpan={3} className="px-3 py-2.5 text-right text-xs uppercase tracking-wide text-text-muted">
                  Total
                </td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-text">{formatCurrencyINR(totalDebit / 100)}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-text">{formatCurrencyINR(totalCredit / 100)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className={`mt-3 text-sm font-semibold ${balanced ? "text-success" : "text-danger"}`}>
          {balanced ? "Ledger check: debits equal credits." : "Ledger check FAILED: total debit does not equal total credit — investigate."}
        </p>
      </div>
    </AppShell>
  );
}
