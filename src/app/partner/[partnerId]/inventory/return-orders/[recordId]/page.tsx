import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { getReturnOrderDetailFields, getReturnOrderTimeline, returnOrderRelated, returnOrderColumns, RETURN_ORDER_FINAL_STATUSES } from "@/lib/sample-data/warehouse";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";
import { CancelReturnOrderButton } from "./CancelReturnOrderButton";

registerPage({
  id: "inventory.return-orders.detail",
  moduleSlug: "inventory",
  title: "Return Orders — Detail",
  path: "/partner/[partnerId]/inventory/return-orders/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation:
    "Detail view of a single return order. Edit / Cancel Return Order are shown only while the record is still Pending/In Transit — i.e. before its real Stock effect has ever been applied (Inbound adds to Stock on Received, Outbound deducts Defective stock on Dispatched). Once it reaches Received, Dispatched, Rejected, or Cancelled it's permanently locked and this becomes purely read-only (see RETURN_ORDER_FINAL_STATUSES) — a finalized stock movement is never silently editable or reversible from here.",
  sourceFile: "src/app/partner/[partnerId]/inventory/return-orders/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ReturnOrdersDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; recordId: string };
  searchParams?: { created?: string; updated?: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "inventory-return-orders", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("inventory.return-orders.detail", getReturnOrderDetailFields(record), returnOrderColumns);
  const timeline = getReturnOrderTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);
  const isFinal = (RETURN_ORDER_FINAL_STATUSES as readonly string[]).includes(String(record["status"] ?? ""));

  return (
    <AppShell topbarTitle="Return Orders">
      <div>
        <RecordDetail
          fields={fields}
          recordLabel={recordLabel}
          searchParams={searchParams}
          timeline={timeline}
          related={returnOrderRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Return Order detail</p>
              </div>
              <div className="flex items-center gap-3">
                {!isFinal && (
                  <>
                    <CancelReturnOrderButton partnerId={params.partnerId} recordId={params.recordId} />
                    <Link href={`/partner/${params.partnerId}/inventory/return-orders/${params.recordId}/edit`} className="btn-outline">
                      Edit
                    </Link>
                  </>
                )}
                <Link href={`/partner/${params.partnerId}/inventory/return-orders`} className="btn-outline">
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
