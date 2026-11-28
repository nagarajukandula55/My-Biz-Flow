import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { DataTable, type Column, type Row } from "@/components/DataTable";
import { RecordCsvExportButton } from "@/components/RecordCsvExportButton";
import { listBusinessRecords } from "@/lib/businessRecords";
import type { LineItem } from "@/lib/sample-data/billing";

registerPage({
  id: "billing.reports.tax-summary",
  moduleSlug: "billing",
  title: "Billing — Reports — Tax Summary",
  path: "/partner/[partnerId]/billing/reports/tax-summary",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation: "Taxable value and tax collected across every Billing invoice line item, grouped by GST rate — computed in-memory from each invoice's line items, no separate GST ledger.",
  sourceFile: "src/app/partner/[partnerId]/billing/reports/tax-summary/page.tsx",
});

export const dynamic = "force-dynamic";

function inRange(date: string, from?: string, to?: string): boolean {
  if (!date) return true;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

const TAX_COLUMNS: Column[] = [
  { key: "taxRate", label: "GST Rate", type: "text" },
  { key: "invoiceCount", label: "Invoices", type: "text" },
  { key: "taxableValue", label: "Taxable Value", type: "currency" },
  { key: "taxCollected", label: "Tax Collected", type: "currency" },
];

export default async function TaxSummaryPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams?: { from?: string; to?: string };
}) {
  const { from, to } = searchParams ?? {};
  const [invoices, notes] = await Promise.all([
    listBusinessRecords(params.partnerId, "billing"),
    listBusinessRecords(params.partnerId, "billing-credit-notes"),
  ]);

  const byRate = new Map<number, { taxableValue: number; taxCollected: number; invoiceIds: Set<string> }>();
  for (const inv of invoices) {
    if (!inRange(String(inv["issueDate"] ?? ""), from, to)) continue;
    const items = (inv["items"] as LineItem[] | undefined) ?? [];
    for (const item of items) {
      const rate = item.taxRate ?? 0;
      const lineValue = item.quantity * item.unitPrice;
      const lineTax = lineValue * (rate / 100);
      const entry = byRate.get(rate) ?? { taxableValue: 0, taxCollected: 0, invoiceIds: new Set<string>() };
      entry.taxableValue += lineValue;
      entry.taxCollected += lineTax;
      entry.invoiceIds.add(String(inv["id"]));
      byRate.set(rate, entry);
    }
  }
  for (const note of notes) {
    if (!inRange(String(note["issueDate"] ?? ""), from, to)) continue;
    const sign = note["noteType"] === "Credit Note" ? -1 : note["noteType"] === "Debit Note" ? 1 : 0;
    if (!sign) continue;
    const items = Array.isArray(note["items"]) ? note["items"] as LineItem[] : [];
    for (const item of items) {
      const rate = Number(item.taxRate ?? 0);
      const value = Number(item.quantity) * Number(item.unitPrice);
      if (!Number.isFinite(rate) || !Number.isFinite(value)) continue;
      const entry = byRate.get(rate) ?? { taxableValue: 0, taxCollected: 0, invoiceIds: new Set<string>() };
      entry.taxableValue += sign * value;
      entry.taxCollected += sign * value * rate / 100;
      byRate.set(rate, entry);
    }
  }

  const rows: Row[] = [...byRate.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rate, v]) => ({
      taxRate: `${rate}%`,
      invoiceCount: v.invoiceIds.size,
      taxableValue: Math.round(v.taxableValue * 100) / 100,
      taxCollected: Math.round(v.taxCollected * 100) / 100,
    }));

  return (
    <AppShell topbarTitle="Tax Summary">
      <div>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">From</span>
            <input
              type="date"
              name="from"
              defaultValue={from ?? ""}
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm font-mono text-text outline-none focus:border-teal"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">To</span>
            <input
              type="date"
              name="to"
              defaultValue={to ?? ""}
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm font-mono text-text outline-none focus:border-teal"
            />
          </label>
          <button type="submit" className="btn-outline">Apply</button>
          {(from || to) && (
            <a href={`/partner/${params.partnerId}/billing/reports/tax-summary`} className="btn-outline">Clear</a>
          )}
        </form>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-text-muted">GST rate-wise invoice values adjusted by credit and debit notes issued in this date range. Review filing eligibility separately.</p>
          <RecordCsvExportButton
            columns={TAX_COLUMNS.map((c) => c.key)}
            rows={rows}
            filename={`tax-summary-${params.partnerId}-${new Date().toISOString().slice(0, 10)}.csv`}
          />
        </div>
        <div className="mt-4">
          <DataTable columns={TAX_COLUMNS} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
