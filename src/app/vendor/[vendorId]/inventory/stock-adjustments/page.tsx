import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { StockAdjustmentsClientTable } from "./StockAdjustmentsClientTable";
import { StockAdjustmentsNewButton } from "./StockAdjustmentsNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { stockAdjustmentColumns } from "@/lib/sample-data/warehouse";

registerPage({
  id: "inventory.stock-adjustments.list",
  moduleSlug: "inventory",
  title: "Stock Adjustments — List",
  path: "/vendor/[vendorId]/inventory/stock-adjustments",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every stock adjustment log entry, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/inventory/stock-adjustments/page.tsx",
});

export default async function StockAdjustmentsPage({ params }: { params: { vendorId: string } }) {
  const columns = await applyCustomizations("inventory.stock-adjustments.list", stockAdjustmentColumns);

  return (
    <AppShell
      topbarTitle="Stock Adjustments"
      topbarActions={
        <StockAdjustmentsNewButton />
      }
    >
      <div>
        <div className="mt-2">
          <StockAdjustmentsClientTable vendorId={params.vendorId} columns={columns} />
        </div>
      </div>
    </AppShell>
  );
}
