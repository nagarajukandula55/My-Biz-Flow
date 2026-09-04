import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { StockAdjustmentsClientTable } from "./StockAdjustmentsClientTable";
import { StockAdjustmentsNewButton } from "./StockAdjustmentsNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { stockAdjustmentColumns } from "@/lib/sample-data/warehouse";
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

  return (
    <AppShell
      topbarTitle="Stock Adjustments"
      topbarActions={
        <StockAdjustmentsNewButton partnerId={params.partnerId} />
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
