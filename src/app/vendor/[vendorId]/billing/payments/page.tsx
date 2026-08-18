import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { PaymentsClientTable } from "./PaymentsClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { billingPaymentColumns } from "@/lib/sample-data/billing-payments";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "billing.payments.list",
  moduleSlug: "billing",
  title: "Billing — Payments",
  path: "/vendor/[vendorId]/billing/payments",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every payment recorded against a Billing invoice, with a \"+ New\" action and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/billing/payments/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function BillingPaymentsPage({ params }: { params: { vendorId: string } }) {
  const columns = await applyCustomizations("billing.payments.list", billingPaymentColumns);
  const rows = await listBusinessRecords(params.vendorId, "billing-payments");

  return (
    <AppShell
      topbarTitle="Payments"
      topbarActions={
        <Link href={`/vendor/${params.vendorId}/billing/payments/new`} className="btn-accent">
          + New Payment
        </Link>
      }
    >
      <div>
        <div className="mt-2">
          <PaymentsClientTable vendorId={params.vendorId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
