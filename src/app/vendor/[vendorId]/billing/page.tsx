import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { BillingClientTable } from "./BillingClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { billingColumns } from "@/lib/sample-data/billing";

registerPage({
  id: "billing.list",
  moduleSlug: "billing",
  title: "Billing — List",
  path: "/vendor/[vendorId]/billing",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every invoice record for the billing module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/billing/page.tsx",
});

export default async function BillingPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("billing");
  const columns = await applyCustomizations("billing.list", billingColumns);

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Billing"}
      topbarActions={
        <Link href={`/vendor/${params.vendorId}/billing/new`} className="btn-accent">
          + New Invoice
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <BillingClientTable vendorId={params.vendorId} columns={columns} />
        </div>
      </div>
    </AppShell>
  );
}

