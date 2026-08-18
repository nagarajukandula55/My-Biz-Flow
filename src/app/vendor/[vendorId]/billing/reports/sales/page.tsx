import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { DataTable, type Column, type Row } from "@/components/DataTable";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "billing.reports.sales",
  moduleSlug: "billing",
  title: "Billing — Reports — Sales Register",
  path: "/vendor/[vendorId]/billing/reports/sales",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation: "Every Billing invoice with its subtotal/tax/total and a summary totals row, sorted by issue date — computed in-memory from Billing invoices, no separate reporting table.",
  sourceFile: "src/app/vendor/[vendorId]/billing/reports/sales/page.tsx",
});

export const dynamic = "force-dynamic";

const SALES_COLUMNS: Column[] = [
  { key: "id", label: "Invoice", type: "relation-link" },
  { key: "customer", label: "Customer", type: "text" },
  { key: "issueDate", label: "Issue Date", type: "date" },
  { key: "subtotal", label: "Subtotal", type: "currency" },
  { key: "taxAmount", label: "Tax", type: "currency" },
  { key: "totalAmount", label: "Total", type: "currency" },
  { key: "paymentStatus", label: "Status", type: "select-chip" },
];

export default async function SalesRegisterPage({ params }: { params: { vendorId: string } }) {
  const invoices = await listBusinessRecords(params.vendorId, "billing");
  const rows: Row[] = [...invoices].sort((a, b) => String(b["issueDate"] ?? "").localeCompare(String(a["issueDate"] ?? "")));

  type Totals = { subtotal: number; taxAmount: number; totalAmount: number };
  const totals = rows.reduce<Totals>(
    (acc, r) => ({
      subtotal: acc.subtotal + (Number(r["subtotal"]) || 0),
      taxAmount: acc.taxAmount + (Number(r["taxAmount"]) || 0),
      totalAmount: acc.totalAmount + (Number(r["totalAmount"]) || 0),
    }),
    { subtotal: 0, taxAmount: 0, totalAmount: 0 }
  );

  return (
    <AppShell topbarTitle="Sales Register">
      <div>
        <p className="text-sm text-text-muted">
          {rows.length} invoice{rows.length === 1 ? "" : "s"} — Subtotal ₹{totals.subtotal.toLocaleString("en-IN")}, Tax ₹
          {totals.taxAmount.toLocaleString("en-IN")}, Total ₹{totals.totalAmount.toLocaleString("en-IN")}
        </p>
        <div className="mt-4">
          <DataTable columns={SALES_COLUMNS} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
