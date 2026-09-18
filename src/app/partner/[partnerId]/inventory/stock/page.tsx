import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { StockClientTable } from "./StockClientTable";
import { StockNewButton } from "./StockNewButton";
import { BulkUploadButton } from "@/components/BulkUploadButton";
import { bulkImportStockAction } from "./actions";
import { applyCustomizations } from "@/lib/designer/customizations";
import { stockColumns, stockFormFields } from "@/lib/sample-data/warehouse";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "inventory.stock.list",
  moduleSlug: "inventory",
  title: "Inventory (Stock) — List",
  path: "/partner/[partnerId]/inventory/stock",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every per-warehouse stock ledger entry, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/inventory/stock/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function StockPage({ params }: { params: { partnerId: string } }) {
  const columns = await applyCustomizations("inventory.stock.list", stockColumns);
  const rows = await listBusinessRecords(params.partnerId, "inventory-stock");

  return (
    <AppShell
      topbarTitle="Inventory (Stock)"
      topbarActions={
        <div className="flex items-center gap-3">
          <BulkUploadButton
            title="Bulk Upload Stock"
            columns={stockFormFields.map((f) => f.key)}
            requiredColumnsNote="Material, Warehouse and Qty on Hand are required per row."
            sampleRow={["USB-C Charging Port Flex Cable", "Central Warehouse — Bengaluru", "25", "0", "10"]}
            templateFilename="stock-template.csv"
            importAction={bulkImportStockAction.bind(null, params.partnerId)}
          />
          <StockNewButton partnerId={params.partnerId} />
        </div>
      }
    >
      <div>
        <div className="mt-2">
          <StockClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
