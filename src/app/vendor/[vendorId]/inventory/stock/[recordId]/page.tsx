import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RecordDetail } from "@/components/RecordDetail";
import { getStockRecord, getStockDetailFields, getStockTimeline, stockRelated, stockColumns } from "@/lib/sample-data/warehouse";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";

registerPage({
  id: "inventory.stock.detail",
  moduleSlug: "inventory",
  title: "Inventory (Stock) — Detail",
  path: "/vendor/[vendorId]/inventory/stock/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation: "Read-only detail view of a single per-warehouse stock ledger entry, rendered via the shared RecordDetail component.",
  sourceFile: "src/app/vendor/[vendorId]/inventory/stock/[recordId]/page.tsx",
});

export default async function StockDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const record = getStockRecord(params.recordId);
  const fields = await applyCustomizationsToDetailFields("inventory.stock.detail", getStockDetailFields(record), stockColumns);
  const timeline = getStockTimeline();
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell topbarTitle="Inventory (Stock)">
      <div>
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={stockRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Stock Entry detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/vendor/${params.vendorId}/inventory/stock`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link href={`/vendor/${params.vendorId}/inventory/stock/${params.recordId}/edit`} className="btn-outline">
                  Edit
                </Link>
              </div>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
