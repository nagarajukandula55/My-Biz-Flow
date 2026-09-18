import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import {
  getStockTransferDetailFields,
  getStockTransferTimeline,
  stockTransferRelated,
  stockTransferColumns,
} from "@/lib/sample-data/warehouse";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";

registerPage({
  id: "inventory.stock-transfers.detail",
  moduleSlug: "inventory",
  title: "Stock Transfers — Detail",
  path: "/partner/[partnerId]/inventory/stock-transfers/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation:
    "Read-only detail view of a single stock transfer. A partner-to-partner transfer shows 'Pending Super Admin Approval' until approved from My-Biz-Flow-Admin's /admin/stock-transfers queue.",
  sourceFile: "src/app/partner/[partnerId]/inventory/stock-transfers/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function StockTransferDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; recordId: string };
  searchParams?: { created?: string; updated?: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "inventory-stock-transfers", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields(
    "inventory.stock-transfers.detail",
    getStockTransferDetailFields(record),
    stockTransferColumns
  );
  const timeline = getStockTransferTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell topbarTitle="Stock Transfers">
      <div>
        <RecordDetail
          fields={fields}
          recordLabel={recordLabel}
          searchParams={searchParams}
          timeline={timeline}
          related={stockTransferRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Stock transfer detail</p>
              </div>
              <Link href={`/partner/${params.partnerId}/inventory/stock-transfers`} className="btn-outline">
                &larr; Back
              </Link>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
