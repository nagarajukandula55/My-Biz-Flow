import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RecurringClientTable } from "./RecurringClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { recurringInvoiceColumns } from "@/lib/sample-data/billing-recurring";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "billing.recurring.list",
  moduleSlug: "billing",
  title: "Billing — Recurring Invoices",
  path: "/vendor/[vendorId]/billing/recurring",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation: "Lists every Recurring Invoice template — a scheduled cron route (api/cron/billing-recurring-invoices) creates a real Billing invoice from any template whose Next Run date has passed.",
  sourceFile: "src/app/vendor/[vendorId]/billing/recurring/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function RecurringInvoicesPage({ params }: { params: { vendorId: string } }) {
  const columns = await applyCustomizations("billing.recurring.list", recurringInvoiceColumns);
  const rows = await listBusinessRecords(params.vendorId, "billing-recurring");

  return (
    <AppShell
      topbarTitle="Recurring Invoices"
      topbarActions={
        <Link href={`/vendor/${params.vendorId}/billing/recurring/new`} className="btn-accent">
          + New Recurring Invoice
        </Link>
      }
    >
      <div>
        <div className="mt-2">
          <RecurringClientTable vendorId={params.vendorId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
