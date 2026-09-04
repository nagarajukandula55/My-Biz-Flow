import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import {
  getMarketplaceDetailFields,
  getMarketplaceTimeline,
  marketplaceRelated,
  marketplaceColumns,
  isMarketplaceOrder,
  computeVendorPerformance,
  type PayoutStatus,
} from "@/lib/sample-data/marketplace";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { VendorLifecycle, OrderLifecycle } from "./MarketplaceLifecycle";

registerPage({
  id: "marketplace.detail",
  moduleSlug: "marketplace",
  title: "Marketplace / Partner Aggregator — Detail",
  path: "/partner/[partnerId]/marketplace/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single partner listing or order, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header. A vendor listing shows an Orders lifecycle panel with server-computed commission math and a performance rollup across its own orders; an order shows a Pending -> Processing -> Paid payout stepper.",
  sourceFile: "src/app/partner/[partnerId]/marketplace/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function MarketplaceDetailPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const mod = await getModule("marketplace");
  const record = await getBusinessRecord(params.partnerId, "marketplace", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("marketplace.detail", getMarketplaceDetailFields(record), marketplaceColumns);
  const timeline = getMarketplaceTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);
  const allMarketplaceRecords = await listBusinessRecords(params.partnerId, "marketplace");
  const orderRecord = isMarketplaceOrder(record);

  return (
    <AppShell topbarTitle={mod?.label ?? "Marketplace / Partner Aggregator"}>
      <div>
        {orderRecord ? (
          <OrderLifecycle
            partnerId={params.partnerId}
            orderId={recordLabel}
            vendorId={String(record["vendorId"])}
            vendorName={String(record["vendorName"] ?? record["vendorId"])}
            saleAmount={Number(record["saleAmount"] ?? 0)}
            commissionRate={Number(record["commissionRate"] ?? 0)}
            commissionAmount={Number(record["commissionAmount"] ?? 0)}
            vendorPayoutAmount={Number(record["vendorPayoutAmount"] ?? 0)}
            payoutStatus={record["payoutStatus"] as PayoutStatus}
            payoutDate={record["payoutDate"] as string | undefined}
          />
        ) : (
          <VendorLifecycle
            partnerId={params.partnerId}
            vendorId={recordLabel}
            commissionRate={Number(record["commissionRate"] ?? 0)}
            performance={computeVendorPerformance(recordLabel, allMarketplaceRecords)}
            orders={allMarketplaceRecords
              .filter((r) => isMarketplaceOrder(r) && r["vendorId"] === recordLabel)
              .map((r) => ({
                id: String(r["id"]),
                saleAmount: Number(r["saleAmount"] ?? 0),
                commissionAmount: Number(r["commissionAmount"] ?? 0),
                vendorPayoutAmount: Number(r["vendorPayoutAmount"] ?? 0),
                payoutStatus: r["payoutStatus"] as PayoutStatus,
              }))}
          />
        )}

        <div className="mt-8">
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={marketplaceRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Partner Listing detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/marketplace`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/partner/${params.partnerId}/marketplace/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
                <DeleteBusinessRecordButton partnerId={params.partnerId} moduleSlug="marketplace" recordKey={params.recordId} recordLabel={recordLabel} />
              </div>
            </div>
          }
        />
        </div>
      </div>
    </AppShell>
  );
}
