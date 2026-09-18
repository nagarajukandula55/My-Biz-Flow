import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { StockTakeClientTable } from "./StockTakeClientTable";
import { StockTakeNewButton } from "./StockTakeNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { stockTakeColumns } from "@/lib/sample-data/warehouse";
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

  return (
    <AppShell
      topbarTitle="Stock Take"
      topbarActions={
        <StockTakeNewButton partnerId={params.partnerId} />
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
