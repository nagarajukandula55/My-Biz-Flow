import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import {
  getBillingPaymentDetailFields,
  getBillingPaymentTimeline,
  billingPaymentRelated,
  billingPaymentColumns,
} from "@/lib/sample-data/billing-payments";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";

registerPage({
  id: "billing.payments.detail",
  moduleSlug: "billing",
  title: "Billing — Payments — Detail",
  path: "/vendor/[vendorId]/billing/payments/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation: "Read-only detail view of a single Billing payment, rendered via the shared RecordDetail component, with Edit and Delete actions in the header.",
  sourceFile: "src/app/vendor/[vendorId]/billing/payments/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function BillingPaymentDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.vendorId, "billing-payments", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields(
    "billing.payments.detail",
    getBillingPaymentDetailFields(record),
    billingPaymentColumns
  );
  const timeline = getBillingPaymentTimeline();
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell topbarTitle="Payments">
      <div>
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={billingPaymentRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Payment detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/vendor/${params.vendorId}/billing/payments`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link href={`/vendor/${params.vendorId}/billing/payments/${params.recordId}/edit`} className="btn-outline">
                  Edit
                </Link>
                <DeleteBusinessRecordButton
                  vendorId={params.vendorId}
                  moduleSlug="billing-payments"
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
