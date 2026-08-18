import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { DataTable, type Column, type Row } from "@/components/DataTable";
import { listBusinessRecords } from "@/lib/businessRecords";
import { computeHsnSummary } from "@/lib/gst";

registerPage({
  id: "accounting-gst.hsn-summary",
  moduleSlug: "accounting-gst",
  title: "GST — HSN-wise Summary",
  path: "/vendor/[vendorId]/accounting-gst/hsn-summary",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation: "GSTR-1's HSN-wise outward-supply summary — every Billing invoice line item grouped by HSN/SAC code and tax rate, computed in-memory by joining Billing invoices against the Billing Items catalog.",
  sourceFile: "src/app/vendor/[vendorId]/accounting-gst/hsn-summary/page.tsx",
});

export const dynamic = "force-dynamic";

const HSN_COLUMNS: Column[] = [
  { key: "hsnSac", label: "HSN/SAC", type: "text" },
  { key: "taxRate", label: "GST Rate", type: "text" },
  { key: "invoiceCount", label: "Line Items", type: "text" },
  { key: "taxableValue", label: "Taxable Value", type: "currency" },
  { key: "taxAmount", label: "Tax Amount", type: "currency" },
];

export default async function HsnSummaryPage({ params }: { params: { vendorId: string } }) {
  const [invoices, items] = await Promise.all([
    listBusinessRecords(params.vendorId, "billing"),
    listBusinessRecords(params.vendorId, "billing-items"),
  ]);
  const summary = computeHsnSummary(invoices, items);
  const rows: Row[] = summary.map((s) => ({ ...s, taxRate: `${s.taxRate}%` }));

  return (
    <AppShell topbarTitle="HSN-wise Summary">
      <div>
        <p className="text-sm text-text-muted">
          Line items without a catalog Item (freehand description, no HSN/SAC on file) are grouped under "Unspecified".
        </p>
        <div className="mt-4">
          <DataTable columns={HSN_COLUMNS} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
