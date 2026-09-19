import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { StockTransfersClientTable } from "./StockTransfersClientTable";
import { StockTransfersNewButton } from "./StockTransfersNewButton";
import { BulkUploadButton } from "@/components/BulkUploadButton";
import { bulkImportStockTransfersAction } from "./actions";
import { applyCustomizations } from "@/lib/designer/customizations";
import { stockTransferColumns, getStockTransferFormFields } from "@/lib/sample-data/warehouse";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "inventory.stock-transfers.list",
  moduleSlug: "inventory",
  title: "Stock Transfers — List",
  path: "/partner/[partnerId]/inventory/stock-transfers",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every stock transfer — between two of this partner's own warehouses, or requested to another onboarded partner (gated behind Super Admin approval, see createStockTransferAction) — with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/inventory/stock-transfers/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function StockTransfersPage({ params }: { params: { partnerId: string } }) {
  const columns = await applyCustomizations("inventory.stock-transfers.list", stockTransferColumns);
  const rows = await listBusinessRecords(params.partnerId, "inventory-stock-transfers");
  const formFields = await getStockTransferFormFields(params.partnerId);

  return (
    <AppShell
      topbarTitle="Stock Transfers"
      topbarActions={
        <div className="flex items-center gap-3">
          <BulkUploadButton
            title="Bulk Upload Stock Transfers"
            columns={formFields.map((f) => f.key)}
            requiredColumnsNote="Material, From Warehouse, Quantity, Transfer Date and Status are required per row. Bulk upload only supports own-warehouse transfers — use + New Transfer for a partner-to-partner request."
            sampleRow={["USB-C Charging Port Flex Cable", "Central Warehouse — Bengaluru", "Secondary Warehouse — Mumbai", "", "5", "2026-09-19", "Rebalancing stock", "Pending"]}
            templateFilename="stock-transfers-template.csv"
            importAction={bulkImportStockTransfersAction.bind(null, params.partnerId)}
          />
          <StockTransfersNewButton partnerId={params.partnerId} fields={formFields} />
        </div>
      }
    >
      <div>
        <div className="mt-2">
          <StockTransfersClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
