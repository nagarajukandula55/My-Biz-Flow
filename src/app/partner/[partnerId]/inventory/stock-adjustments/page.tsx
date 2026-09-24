import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { StockAdjustmentsClientTable } from "./StockAdjustmentsClientTable";
import { StockAdjustmentsNewButton } from "./StockAdjustmentsNewButton";
import { BulkUploadButton } from "@/components/BulkUploadButton";
import { bulkImportStockAdjustmentsAction } from "./actions";
import { applyCustomizations } from "@/lib/designer/customizations";
import { stockAdjustmentColumns, getStockAdjustmentFormFields } from "@/lib/sample-data/warehouse";
import { getBomOptionsForPartner } from "@/lib/sample-data/bom";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "inventory.stock-adjustments.list",
  moduleSlug: "inventory",
  title: "Stock Adjustments — List",
  path: "/partner/[partnerId]/inventory/stock-adjustments",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every stock adjustment log entry, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/inventory/stock-adjustments/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function StockAdjustmentsPage({ params }: { params: { partnerId: string } }) {
  const columns = await applyCustomizations("inventory.stock-adjustments.list", stockAdjustmentColumns);
  const rows = await listBusinessRecords(params.partnerId, "inventory-stock-adjustments");
  // Partner-scoped Warehouse/Material options — see getWarehouseOptionsForPartner/getBomOptionsForPartner's doc comments.
  const formFields = await getStockAdjustmentFormFields(params.partnerId);
  const materialOptions = await getBomOptionsForPartner(params.partnerId);

  return (
    <AppShell
      topbarTitle="Stock Adjustments"
      topbarActions={
        <div className="flex items-center gap-3">
          <BulkUploadButton
            title="Bulk Upload Stock Adjustments"
            columns={formFields.map((f) => f.key)}
            requiredColumnsNote="Warehouse, Material, Type, Quantity, Reason and Date are required per row."
            sampleRow={["Central Warehouse — Bengaluru", "USB-C Charging Port Flex Cable", "Increase", "10", "Stock Count Correction", "", "2026-09-19"]}
            templateFilename="stock-adjustments-template.csv"
            importAction={bulkImportStockAdjustmentsAction.bind(null, params.partnerId)}
          />
          <StockAdjustmentsNewButton partnerId={params.partnerId} fields={formFields} materialOptions={materialOptions} />
        </div>
      }
    >
      <div>
        <div className="mt-2">
          <StockAdjustmentsClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
