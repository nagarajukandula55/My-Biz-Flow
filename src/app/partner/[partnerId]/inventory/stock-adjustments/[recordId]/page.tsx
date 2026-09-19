import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import {
  getStockAdjustmentDetailFields,
  getStockAdjustmentTimeline,
  stockAdjustmentRelated,
  stockAdjustmentColumns,
} from "@/lib/sample-data/warehouse";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";

registerPage({
  id: "inventory.stock-adjustments.detail",
  moduleSlug: "inventory",
  title: "Stock Adjustments — Detail",
  path: "/partner/[partnerId]/inventory/stock-adjustments/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation: "Read-only detail view of a single stock adjustment — an audit-trail document, not editable after posting since it already applied its delta to the real Stock ledger (see createStockAdjustmentAction).",
  sourceFile: "src/app/partner/[partnerId]/inventory/stock-adjustments/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function StockAdjustmentDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; recordId: string };
  searchParams?: { created?: string; updated?: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "inventory-stock-adjustments", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields(
    "inventory.stock-adjustments.detail",
    getStockAdjustmentDetailFields(record),
    stockAdjustmentColumns
  );
  const timeline = getStockAdjustmentTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell topbarTitle="Stock Adjustments">
      <div>
        <RecordDetail
          fields={fields}
          recordLabel={recordLabel}
          searchParams={searchParams}
          timeline={timeline}
          related={stockAdjustmentRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Stock Adjustment detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/inventory/stock-adjustments`} className="btn-outline">
                  &larr; Back
                </Link>
              </div>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
