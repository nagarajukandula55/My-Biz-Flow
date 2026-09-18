import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { StockTransfersClientTable } from "./StockTransfersClientTable";
import { StockTransfersNewButton } from "./StockTransfersNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { stockTransferColumns } from "@/lib/sample-data/warehouse";
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
  explanation: "Lists every stock transfer between two of this partner's warehouses, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/inventory/stock-transfers/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function StockTransfersPage({ params }: { params: { partnerId: string } }) {
  const columns = await applyCustomizations("inventory.stock-transfers.list", stockTransferColumns);
  const rows = await listBusinessRecords(params.partnerId, "inventory-stock-transfers");

  return (
    <AppShell
      topbarTitle="Stock Transfers"
      topbarActions={
        <StockTransfersNewButton partnerId={params.partnerId} />
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
