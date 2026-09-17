import { AppShell } from "@/components/AppShell";
import { renderTierGate } from "@/lib/pageTierGate";
import { registerPage } from "@/lib/designer/registry";
import { DataTable, type Column, type Row } from "@/components/DataTable";
import { listBusinessRecords } from "@/lib/businessRecords";
import { expensesByCategory, sumExpenses } from "@/lib/sample-data/billing-expenses";
import { formatCurrencyINR } from "@/lib/format";

registerPage({
  id: "billing.reports.profit-loss",
  moduleSlug: "billing",
  title: "Billing — Reports — Profit & Loss",
  path: "/partner/[partnerId]/billing/reports/profit-loss",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation:
    "Cash-basis Profit & Loss for a date range: revenue is the taxable value of Billing invoices less credit notes plus debit notes, expenses are Billing expense records grouped by category, and net profit is the difference — computed in-memory from live BusinessRecord data, with no separate ledger or double-entry journal behind it.",
  sourceFile: "src/app/partner/[partnerId]/billing/reports/profit-loss/page.tsx",
});

export const dynamic = "force-dynamic";

const CATEGORY_COLUMNS: Column[] = [
  { key: "category", label: "Expense Category", type: "text" },
  { key: "amount", label: "Amount", type: "currency" },
  { key: "share", label: "% of Expenses", type: "text" },
];

function inRange(date: string, from?: string, to?: string): boolean {
  if (!date) return true;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function defaultRange(): { from: string; to: string } {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  return { from: first.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) };
}

export default async function ProfitLossReportPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams?: { from?: string; to?: string };
}) {
  const tierGate = await renderTierGate(params.partnerId, "billing.reports.profit-loss", "the Profit & Loss report");
  if (tierGate) return <AppShell topbarTitle={"Profit & Loss"}>{tierGate}</AppShell>;

  const fallback = defaultRange();
  const from = searchParams?.from || fallback.from;
  const to = searchParams?.to || fallback.to;

  const [invoices, notes, expenses] = await Promise.all([
    listBusinessRecords(params.partnerId, "billing"),
    listBusinessRecords(params.partnerId, "billing-credit-notes"),
    listBusinessRecords(params.partnerId, "billing-expenses"),
  ]);

  let invoiced = 0;
  let invoiceCount = 0;
  for (const inv of invoices) {
    if (!inRange(String(inv["issueDate"] ?? ""), from, to)) continue;
    invoiced += Number(inv["subtotal"] ?? inv["totalAmount"] ?? 0);
    invoiceCount += 1;
  }

  let creditAdjust = 0;
  let debitAdjust = 0;
  for (const n of notes) {
    if (!inRange(String(n["issueDate"] ?? ""), from, to)) continue;
    const amount = Number(n["subtotal"] ?? n["totalAmount"] ?? 0);
    if (String(n["noteType"]) === "Debit Note") debitAdjust += amount;
    else creditAdjust += amount;
  }

  const revenue = invoiced - creditAdjust + debitAdjust;
  const expenseTotal = sumExpenses(expenses, from, to);
  const netProfit = revenue - expenseTotal;
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  const byCategory = expensesByCategory(expenses, from, to);
  const categoryRows: Row[] = byCategory.map((c) => ({
    category: c.category,
    amount: c.amount,
    share: expenseTotal > 0 ? `${((c.amount / expenseTotal) * 100).toFixed(1)}%` : "—",
  }));

  const summary = [
    { label: "Revenue (invoiced, ex-tax)", value: invoiced },
    { label: "Less: Credit Notes", value: -creditAdjust },
    { label: "Add: Debit Notes", value: debitAdjust },
    { label: "Net Revenue", value: revenue, strong: true },
    { label: "Less: Expenses", value: -expenseTotal },
    { label: "Net Profit", value: netProfit, strong: true },
  ];

  return (
    <AppShell topbarTitle="Profit & Loss">
      <div>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">From</span>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm font-mono text-text outline-none focus:border-teal"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">To</span>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm font-mono text-text outline-none focus:border-teal"
            />
          </label>
          <button type="submit" className="btn-outline">
            Apply
          </button>
        </form>

        <div className="mt-5 rounded-lg border border-border bg-bg-raised">
          {summary.map((line) => (
            <div
              key={line.label}
              className={`flex items-center justify-between border-b border-border px-4 py-3 text-sm last:border-b-0 ${
                line.strong ? "font-semibold text-text" : "text-text-muted"
              }`}
            >
              <span>{line.label}</span>
              <span className={`font-mono ${line.strong && line.value < 0 ? "text-danger" : ""}`}>
                {formatCurrencyINR(line.value)}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-3 text-sm text-text-muted">
          {invoiceCount} invoice{invoiceCount === 1 ? "" : "s"} in range · net margin{" "}
          <span className="font-mono font-semibold text-text">{margin.toFixed(1)}%</span>
        </p>

        <h2 className="mt-8 font-display text-base font-bold text-text">Expenses by category</h2>
        <div className="mt-3">
          <DataTable columns={CATEGORY_COLUMNS} rows={categoryRows} />
        </div>
      </div>
    </AppShell>
  );
}
