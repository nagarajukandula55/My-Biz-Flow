import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { StockClientTable } from "./StockClientTable";
import { StockNewButton } from "./StockNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { stockColumns } from "@/lib/sample-data/warehouse";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "inventory.stock.list",
  moduleSlug: "inventory",
  title: "Inventory (Stock) — List",
  path: "/vendor/[vendorId]/inventory/stock",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every per-warehouse stock ledger entry, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/inventory/stock/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function StockPage({ params }: { params: { vendorId: string } }) {
  const columns = await applyCustomizations("inventory.stock.list", stockColumns);
  const rows = await listBusinessRecords(params.vendorId, "inventory-stock");

  return (
    <AppShell
      topbarTitle="Inventory (Stock)"
      topbarActions={
        <StockNewButton vendorId={params.vendorId} />
      }
    >
      <div>
        <div className="mt-2">
          <StockClientTable vendorId={params.vendorId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
