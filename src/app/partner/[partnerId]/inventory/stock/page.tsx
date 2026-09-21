import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { DashboardWidget } from "@/components/DashboardWidget";
import { StockClientTable } from "./StockClientTable";
import { RecordCsvExportButton } from "@/components/RecordCsvExportButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { stockColumns } from "@/lib/sample-data/warehouse";
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
  explanation:
    "Lists every per-warehouse stock ledger entry — read-only, no \"+ New\"/bulk-upload here by deliberate design. A stock quantity only ever enters this module through an audited flow that has a reason attached: Stock Adjustment (including its own \"Initial Stock\" reason for opening balances), Part Order receiving, or Stock Take reconciliation — never a bare create/import straight onto this list, which used to let a quantity appear with no record of why. Each row's Material Type is either Good (normal usable/sellable stock) or Defective (a row with no Material Type value is treated as Good — see rowCondition() in src/lib/inventoryStock.ts). Defective rows are generated automatically, one unit per unit consumed, whenever a workorder deducts a Good part from Stock (deductInventoryForWorkorderAction) — never counted toward Available Qty for sale/use. Defective stock is never partner-editable by any manual path (not Stock Adjustments, not Stock Transfers, not this list's own edit page) — the only way it ever decreases is an Outbound Return Order with a Vendor/OEM name and a Challan Number (Inventory > Return Orders), so every reduction has real shipping paperwork behind it.",
  sourceFile: "src/app/partner/[partnerId]/inventory/stock/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function StockPage({ params }: { params: { partnerId: string } }) {
  const columns = await applyCustomizations("inventory.stock.list", stockColumns);
  const rows = await listBusinessRecords(params.partnerId, "inventory-stock");

  const goodRows = rows.filter((r) => r["condition"] !== "Defective");
  const defectiveRows = rows.filter((r) => r["condition"] === "Defective");
  const totalGoodQty = goodRows.reduce((sum, r) => sum + Number(r["qtyOnHand"] ?? 0), 0);
  const totalDefectiveQty = defectiveRows.reduce((sum, r) => sum + Number(r["qtyOnHand"] ?? 0), 0);

  return (
    <AppShell
      topbarTitle="Inventory (Stock)"
      topbarActions={
        <div className="flex items-center gap-3">
          <RecordCsvExportButton
            columns={columns.map((c) => c.key)}
            rows={rows}
            filename={`stock-${params.partnerId}-${new Date().toISOString().slice(0, 10)}.csv`}
          />
        </div>
      }
    >
      <div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <DashboardWidget label="Good Qty on Hand" value={String(totalGoodQty)} />
          <DashboardWidget label="Defective Qty on Hand" value={String(totalDefectiveQty)} neon={totalDefectiveQty > 0} />
          <DashboardWidget label="Total Stock Rows" value={String(rows.length)} />
        </div>
        <div className="mt-4">
          <StockClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
