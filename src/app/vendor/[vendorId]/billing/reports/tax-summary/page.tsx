import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { DataTable, type Column, type Row } from "@/components/DataTable";
import { listBusinessRecords } from "@/lib/businessRecords";
import type { LineItem } from "@/lib/sample-data/billing";

registerPage({
  id: "billing.reports.tax-summary",
  moduleSlug: "billing",
  title: "Billing — Reports — Tax Summary",
  path: "/vendor/[vendorId]/billing/reports/tax-summary",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation: "Taxable value and tax collected across every Billing invoice line item, grouped by GST rate — computed in-memory from each invoice's line items, no separate GST ledger.",
  sourceFile: "src/app/vendor/[vendorId]/billing/reports/tax-summary/page.tsx",
});

export const dynamic = "force-dynamic";

const TAX_COLUMNS: Column[] = [
  { key: "taxRate", label: "GST Rate", type: "text" },
  { key: "invoiceCount", label: "Invoices", type: "text" },
  { key: "taxableValue", label: "Taxable Value", type: "currency" },
  { key: "taxCollected", label: "Tax Collected", type: "currency" },
];

export default async function TaxSummaryPage({ params }: { params: { vendorId: string } }) {
  const invoices = await listBusinessRecords(params.vendorId, "billing");

  const byRate = new Map<number, { taxableValue: number; taxCollected: number; invoiceIds: Set<string> }>();
  for (const inv of invoices) {
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

  const rows: Row[] = [...byRate.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rate, v]) => ({
      taxRate: `${rate}%`,
      invoiceCount: v.invoiceIds.size,
      taxableValue: v.taxableValue,
      taxCollected: v.taxCollected,
    }));

  return (
    <AppShell topbarTitle="Tax Summary">
      <div>
        <p className="text-sm text-text-muted">GST rate-wise taxable value and tax collected across all invoices.</p>
        <div className="mt-4">
          <DataTable columns={TAX_COLUMNS} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
