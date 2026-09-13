import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import {
  getDeliveryChallanDetailFields,
  getSalesDocTimeline,
  salesDocRelated,
  deliveryChallanColumns,
} from "@/lib/sample-data/billing-sales-documents";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";

registerPage({
  id: "billing.delivery-challans.detail",
  moduleSlug: "billing",
  title: "Billing — Delivery Challans — Detail",
  path: "/partner/[partnerId]/billing/delivery-challans/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation: "Read-only detail view of a single Delivery Challan, rendered via the shared RecordDetail component, with Edit, View document and Delete actions in the header.",
  sourceFile: "src/app/partner/[partnerId]/billing/delivery-challans/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function DeliveryChallanDetailPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "billing-delivery-challans", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields(
    "billing.delivery-challans.detail",
    getDeliveryChallanDetailFields(record),
    deliveryChallanColumns
  );
  const timeline = getSalesDocTimeline("Delivery Challan");
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell topbarTitle="Delivery Challans">
      <div>
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={salesDocRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Delivery Challan detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/billing/delivery-challans`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link href={`/partner/${params.partnerId}/billing/delivery-challans/${params.recordId}/document`} className="btn-outline">
                  View document
                </Link>
                <Link href={`/partner/${params.partnerId}/billing/delivery-challans/${params.recordId}/edit`} className="btn-outline">
                  Edit
                </Link>
                <DeleteBusinessRecordButton
                  partnerId={params.partnerId}
                  moduleSlug="billing-delivery-challans"
                  recordKey={params.recordId}
                  recordLabel={recordLabel}
                />
              </div>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
