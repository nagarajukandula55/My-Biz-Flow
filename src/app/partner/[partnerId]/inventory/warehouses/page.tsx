import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { WarehousesClientTable } from "./WarehousesClientTable";
import { WarehousesNewButton } from "./WarehousesNewButton";
import { BulkUploadButton } from "@/components/BulkUploadButton";
import { bulkImportWarehousesAction } from "./actions";
import { applyCustomizations } from "@/lib/designer/customizations";
import { warehouseColumns, warehouseFormFields } from "@/lib/sample-data/warehouse";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "inventory.warehouses.list",
  moduleSlug: "inventory",
  title: "Warehouses — List",
  path: "/partner/[partnerId]/inventory/warehouses",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every warehouse, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/inventory/warehouses/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function WarehousesPage({ params }: { params: { partnerId: string } }) {
  const columns = await applyCustomizations("inventory.warehouses.list", warehouseColumns);
  const rows = await listBusinessRecords(params.partnerId, "inventory-warehouses");

  return (
    <AppShell
      topbarTitle="Warehouses"
      topbarActions={
        <div className="flex items-center gap-3">
          <BulkUploadButton
            title="Bulk Upload Warehouses"
            columns={warehouseFormFields.filter((f) => f.key !== "id").map((f) => f.key)}
            requiredColumnsNote="Warehouse Name, Type, City and Status are required per row."
            sampleRow={["Secondary Warehouse — Mumbai", "Regional", "", "", "Maharashtra", "Mumbai", "Rahul Sharma", "9876543210", "Active"]}
            templateFilename="warehouses-template.csv"
            importAction={bulkImportWarehousesAction.bind(null, params.partnerId)}
          />
          <WarehousesNewButton partnerId={params.partnerId} />
        </div>
      }
    >
      <div>
        <div className="mt-2">
          <WarehousesClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
