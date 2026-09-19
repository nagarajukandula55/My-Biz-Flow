import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { StockTakeClientTable } from "./StockTakeClientTable";
import { StockTakeNewButton } from "./StockTakeNewButton";
import { BulkUploadButton } from "@/components/BulkUploadButton";
import { bulkImportStockTakeAction } from "./actions";
import { applyCustomizations } from "@/lib/designer/customizations";
import { stockTakeColumns, getStockTakeFormFields } from "@/lib/sample-data/warehouse";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "inventory.stock-take.list",
  moduleSlug: "inventory",
  title: "Stock Take — List",
  path: "/partner/[partnerId]/inventory/stock-take",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every physical stock count, with a \"+ New\" action to log one and its variance against the system's expected quantity.",
  sourceFile: "src/app/partner/[partnerId]/inventory/stock-take/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function StockTakePage({ params }: { params: { partnerId: string } }) {
  const columns = await applyCustomizations("inventory.stock-take.list", stockTakeColumns);
  const rows = await listBusinessRecords(params.partnerId, "inventory-stock-take");
  const formFields = await getStockTakeFormFields(params.partnerId);

  return (
    <AppShell
      topbarTitle="Stock Take"
      topbarActions={
        <div className="flex items-center gap-3">
          <BulkUploadButton
            title="Bulk Upload Stock Take"
            columns={formFields.map((f) => f.key)}
            requiredColumnsNote="Material, Warehouse, Expected Qty, Counted Qty, Counted Date and Status are required per row. Variance is computed automatically."
            sampleRow={["USB-C Charging Port Flex Cable", "Central Warehouse — Bengaluru", "50", "48", "2026-09-19", "Store Manager", "Short by 2 on physical count", "Pending"]}
            templateFilename="stock-take-template.csv"
            importAction={bulkImportStockTakeAction.bind(null, params.partnerId)}
          />
          <StockTakeNewButton partnerId={params.partnerId} fields={formFields} />
        </div>
      }
    >
      <div>
        <div className="mt-2">
          <StockTakeClientTable columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
