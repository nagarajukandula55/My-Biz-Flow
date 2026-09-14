import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { DataTable, type Column, type Row } from "@/components/DataTable";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "billing.reports.sales",
  moduleSlug: "billing",
  title: "Billing — Reports — Sales Register",
  path: "/partner/[partnerId]/billing/reports/sales",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation: "Every Billing invoice with its subtotal/tax/total and a summary totals row, sorted by issue date — computed in-memory from Billing invoices, no separate reporting table.",
  sourceFile: "src/app/partner/[partnerId]/billing/reports/sales/page.tsx",
});

export const dynamic = "force-dynamic";

function inRange(date: string, from?: string, to?: string): boolean {
  if (!date) return true;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

const SALES_COLUMNS: Column[] = [
  { key: "id", label: "Invoice", type: "relation-link" },
  { key: "customer", label: "Customer", type: "text" },
  { key: "issueDate", label: "Issue Date", type: "date" },
  { key: "subtotal", label: "Subtotal", type: "currency" },
  { key: "taxAmount", label: "Tax", type: "currency" },
  { key: "totalAmount", label: "Total", type: "currency" },
  { key: "paymentStatus", label: "Status", type: "select-chip" },
];

export default async function SalesRegisterPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams?: { from?: string; to?: string };
}) {
  const { from, to } = searchParams ?? {};
  const invoices = await listBusinessRecords(params.partnerId, "billing");
  const rows: Row[] = invoices
    .filter((r) => inRange(String(r["issueDate"] ?? ""), from, to))
    .sort((a, b) => String(b["issueDate"] ?? "").localeCompare(String(a["issueDate"] ?? "")));

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
            <a href={`/partner/${params.partnerId}/billing/reports/sales`} className="btn-outline">Clear</a>
          )}
        </form>
        <p className="mt-4 text-sm text-text-muted">
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
