import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { WarehousesClientTable } from "./WarehousesClientTable";
import { WarehousesNewButton } from "./WarehousesNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { warehouseColumns } from "@/lib/sample-data/warehouse";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "inventory.warehouses.list",
  moduleSlug: "inventory",
  title: "Warehouses — List",
  path: "/vendor/[vendorId]/inventory/warehouses",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every warehouse, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/inventory/warehouses/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function WarehousesPage({ params }: { params: { vendorId: string } }) {
  const columns = await applyCustomizations("inventory.warehouses.list", warehouseColumns);
  const rows = await listBusinessRecords(params.vendorId, "inventory-warehouses");

  return (
    <AppShell
      topbarTitle="Warehouses"
      topbarActions={
        <WarehousesNewButton vendorId={params.vendorId} />
      }
    >
      <div>
        <div className="mt-2">
          <WarehousesClientTable vendorId={params.vendorId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
