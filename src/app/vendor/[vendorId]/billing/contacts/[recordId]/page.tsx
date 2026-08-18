import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import {
  getBillingContactDetailFields,
  getBillingContactTimeline,
  billingContactRelated,
  billingContactColumns,
} from "@/lib/sample-data/billing-contacts";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";

registerPage({
  id: "billing.contacts.detail",
  moduleSlug: "billing",
  title: "Billing — Contacts — Detail",
  path: "/vendor/[vendorId]/billing/contacts/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation: "Read-only detail view of a single Billing Contact, rendered via the shared RecordDetail component, with Edit and Delete actions in the header.",
  sourceFile: "src/app/vendor/[vendorId]/billing/contacts/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function BillingContactDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.vendorId, "billing-contacts", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields(
    "billing.contacts.detail",
    getBillingContactDetailFields(record),
    billingContactColumns
  );
  const timeline = getBillingContactTimeline();
  const recordLabel = String(record["name"] ?? record["id"] ?? params.recordId);

  return (
    <AppShell topbarTitle="Contacts">
      <div>
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={billingContactRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Contact detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/vendor/${params.vendorId}/billing/contacts`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link href={`/vendor/${params.vendorId}/billing/contacts/${params.recordId}/edit`} className="btn-outline">
                  Edit
                </Link>
                <DeleteBusinessRecordButton
                  vendorId={params.vendorId}
                  moduleSlug="billing-contacts"
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
