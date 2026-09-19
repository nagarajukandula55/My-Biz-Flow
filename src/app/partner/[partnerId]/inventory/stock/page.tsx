import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
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
    "Lists every per-warehouse stock ledger entry — read-only, no \"+ New\"/bulk-upload here by deliberate design. A stock quantity only ever enters this module through an audited flow that has a reason attached: Stock Adjustment (including its own \"Initial Stock\" reason for opening balances), Part Order receiving, or Stock Take reconciliation — never a bare create/import straight onto this list, which used to let a quantity appear with no record of why.",
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
          <RecordCsvExportButton
            columns={columns.map((c) => c.key)}
            rows={rows}
            filename={`stock-${params.partnerId}-${new Date().toISOString().slice(0, 10)}.csv`}
          />
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
