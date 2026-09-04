import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import { getWholesaleB2bDetailFields, getWholesaleB2bTimeline, wholesaleB2bRelated, wholesaleB2bColumns, extractWholesaleOrderFromRecord } from "@/lib/sample-data/wholesale-b2b";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { WholesaleOrderActions } from "./WholesaleOrderActions";

registerPage({
  id: "wholesale-b2b.detail",
  moduleSlug: "wholesale-b2b",
  title: "Wholesale / Distributor B2B — Detail",
  path: "/partner/[partnerId]/wholesale-b2b/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single order, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header. The Tiered Pricing & Credit panel above it shows the real bulk-discount breakdown and the dealer's live outstanding balance against their credit limit, plus a Create Invoice action once Dispatched/Delivered.",
  sourceFile: "src/app/partner/[partnerId]/wholesale-b2b/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function WholesaleB2bDetailPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const mod = await getModule("wholesale-b2b");
  const record = await getBusinessRecord(params.partnerId, "wholesale-b2b", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("wholesale-b2b.detail", getWholesaleB2bDetailFields(record), wholesaleB2bColumns);
  const timeline = getWholesaleB2bTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);
  const order = extractWholesaleOrderFromRecord(record);
  const allOrders = await listBusinessRecords(params.partnerId, "wholesale-b2b");
  const outstandingBalance = allOrders
    .filter((r) => String(r["dealerName"] ?? "") === order.dealerName && String(r["id"]) !== recordLabel && r["status"] !== "Delivered")
    .reduce((sum, r) => sum + Number(r["bulkPriceTotal"] ?? 0), 0) + (order.status !== "Delivered" ? order.bulkPriceTotal : 0);

  return (
    <AppShell topbarTitle={mod?.label ?? "Wholesale / Distributor B2B"}>
      <div>
        <WholesaleOrderActions
          partnerId={params.partnerId}
          orderId={recordLabel}
          status={order.status}
          itemQuantity={order.itemQuantity}
          itemListPrice={order.itemListPrice}
          unitPrice={order.unitPrice}
          discountPercent={order.discountPercent}
          bulkPriceTotal={order.bulkPriceTotal}
          creditLimit={order.creditLimit}
          outstandingBalance={outstandingBalance}
          invoiceId={order.invoiceId}
        />

        <div className="mt-8">
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={wholesaleB2bRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Order detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/wholesale-b2b`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/partner/${params.partnerId}/wholesale-b2b/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
                <DeleteBusinessRecordButton partnerId={params.partnerId} moduleSlug="wholesale-b2b" recordKey={params.recordId} recordLabel={recordLabel} />
              </div>
            </div>
          }
        />
        </div>
      </div>
    </AppShell>
  );
}
