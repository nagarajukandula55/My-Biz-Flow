import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { ItemsClientTable } from "./ItemsClientTable";
import { ItemsNewButton } from "./ItemsNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { billingItemColumns } from "@/lib/sample-data/billing-items";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "billing.items.list",
  moduleSlug: "billing",
  title: "Billing — Items",
  path: "/partner/[partnerId]/billing/items",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every Item/Service in the Billing catalog that invoice line items can look up, with a \"+ New\" action and row-click navigation into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/billing/items/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function BillingItemsPage({ params }: { params: { partnerId: string } }) {
  const columns = await applyCustomizations("billing.items.list", billingItemColumns);
  const rows = await listBusinessRecords(params.partnerId, "billing-items");

  return (
    <AppShell
      topbarTitle="Items"
      topbarActions={<ItemsNewButton partnerId={params.partnerId} />}
    >
      <div>
        <div className="mt-2">
          <ItemsClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
