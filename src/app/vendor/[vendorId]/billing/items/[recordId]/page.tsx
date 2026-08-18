import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import {
  getBillingItemDetailFields,
  getBillingItemTimeline,
  billingItemRelated,
  billingItemColumns,
} from "@/lib/sample-data/billing-items";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";

registerPage({
  id: "billing.items.detail",
  moduleSlug: "billing",
  title: "Billing — Items — Detail",
  path: "/vendor/[vendorId]/billing/items/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation: "Read-only detail view of a single Billing catalog Item, rendered via the shared RecordDetail component, with Edit and Delete actions in the header.",
  sourceFile: "src/app/vendor/[vendorId]/billing/items/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function BillingItemDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.vendorId, "billing-items", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields(
    "billing.items.detail",
    getBillingItemDetailFields(record),
    billingItemColumns
  );
  const timeline = getBillingItemTimeline();
  const recordLabel = String(record["name"] ?? record["id"] ?? params.recordId);

  return (
    <AppShell topbarTitle="Items">
      <div>
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={billingItemRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Item detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/vendor/${params.vendorId}/billing/items`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link href={`/vendor/${params.vendorId}/billing/items/${params.recordId}/edit`} className="btn-outline">
                  Edit
                </Link>
                <DeleteBusinessRecordButton
                  vendorId={params.vendorId}
                  moduleSlug="billing-items"
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
