import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { ReturnOrdersClientTable } from "./ReturnOrdersClientTable";
import { ReturnOrdersNewButton } from "./ReturnOrdersNewButton";
import { BulkUploadButton } from "@/components/BulkUploadButton";
import { bulkImportReturnOrdersAction } from "./actions";
import { applyCustomizations } from "@/lib/designer/customizations";
import { returnOrderColumns, returnOrderFormFields } from "@/lib/sample-data/warehouse";
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
        <div className="flex items-center gap-3">
          <BulkUploadButton
            title="Bulk Upload Return Orders"
            columns={returnOrderFormFields.map((f) => f.key)}
            requiredColumnsNote="Return Type, Material, Quantity, Source Location, Destination Warehouse, Status and Created Date are required per row."
            sampleRow={["WO202608080002", "Defective", "Li-ion Battery 4000mAh — Generic", "1", "Indiranagar Service Centre", "Central Warehouse — Bengaluru", "Pending", "2026-09-19"]}
            templateFilename="return-orders-template.csv"
            importAction={bulkImportReturnOrdersAction.bind(null, params.partnerId)}
          />
          <ReturnOrdersNewButton partnerId={params.partnerId} />
        </div>
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
