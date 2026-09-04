import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { ReturnOrdersClientTable } from "./ReturnOrdersClientTable";
import { ReturnOrdersNewButton } from "./ReturnOrdersNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { returnOrderColumns } from "@/lib/sample-data/warehouse";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "inventory.return-orders.list",
  moduleSlug: "inventory",
  title: "Return Orders — List",
  path: "/partner/[partnerId]/inventory/return-orders",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every return order (defective/good material back to the mapped warehouse), with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/inventory/return-orders/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ReturnOrdersPage({ params }: { params: { partnerId: string } }) {
  const columns = await applyCustomizations("inventory.return-orders.list", returnOrderColumns);
  const rows = await listBusinessRecords(params.partnerId, "inventory-return-orders");

  return (
    <AppShell
      topbarTitle="Return Orders"
      topbarActions={
        <ReturnOrdersNewButton partnerId={params.partnerId} />
      }
    >
      <div>
        <div className="mt-2">
          <ReturnOrdersClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
