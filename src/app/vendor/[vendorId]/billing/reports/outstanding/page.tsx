import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { DataTable, type Column, type Row } from "@/components/DataTable";
import { listBusinessRecords } from "@/lib/businessRecords";
import { getInvoiceBalance } from "@/lib/sample-data/billing-payments";

registerPage({
  id: "billing.reports.outstanding",
  moduleSlug: "billing",
  title: "Billing — Reports — Outstanding / AR Aging",
  path: "/vendor/[vendorId]/billing/reports/outstanding",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation: "Every invoice with a balance greater than zero, aggregated per contact and bucketed by days overdue (0-30 / 31-60 / 61-90 / 90+) — computed in-memory from Billing invoices + payments, no separate ledger table.",
  sourceFile: "src/app/vendor/[vendorId]/billing/reports/outstanding/page.tsx",
});

export const dynamic = "force-dynamic";

const AGING_COLUMNS: Column[] = [
  { key: "invoiceId", label: "Invoice", type: "relation-link" },
  { key: "contact", label: "Contact", type: "text" },
  { key: "dueDate", label: "Due Date", type: "date" },
  { key: "daysOverdue", label: "Days Overdue", type: "text" },
  { key: "bucket", label: "Bucket", type: "select-chip" },
  { key: "balance", label: "Balance Due", type: "currency" },
];

function bucketFor(days: number): string {
  if (days <= 0) return "Not Due";
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

export default async function OutstandingReportPage({ params }: { params: { vendorId: string } }) {
  const [invoices, payments] = await Promise.all([
    listBusinessRecords(params.vendorId, "billing"),
    listBusinessRecords(params.vendorId, "billing-payments"),
  ]);

  const today = Date.now();
  const rows: Row[] = [];
  let totalOutstanding = 0;

  for (const inv of invoices) {
    const id = String(inv["id"]);
    const { balance } = getInvoiceBalance(payments, id, Number(inv["totalAmount"] ?? 0));
    if (balance <= 0) continue;
    const dueDate = String(inv["dueDate"] ?? "");
    const daysOverdue = dueDate ? Math.floor((today - new Date(dueDate).getTime()) / 86400000) : 0;
    totalOutstanding += balance;
    rows.push({
      invoiceId: id,
      contact: inv["customer"],
      dueDate,
      daysOverdue,
      bucket: bucketFor(daysOverdue),
      balance,
    });
  }

  rows.sort((a, b) => Number(b["daysOverdue"]) - Number(a["daysOverdue"]));

  return (
    <AppShell topbarTitle="Outstanding / AR Aging">
      <div>
        <p className="text-sm text-text-muted">
          Total outstanding: <span className="font-mono font-semibold text-text">₹{totalOutstanding.toLocaleString("en-IN")}</span> across {rows.length} unpaid invoice{rows.length === 1 ? "" : "s"}.
        </p>
        <div className="mt-4">
          <DataTable columns={AGING_COLUMNS} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
