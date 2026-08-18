import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import {
  getRecurringInvoiceDetailFields,
  getRecurringInvoiceTimeline,
  recurringInvoiceRelated,
  recurringInvoiceColumns,
} from "@/lib/sample-data/billing-recurring";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";

registerPage({
  id: "billing.recurring.detail",
  moduleSlug: "billing",
  title: "Billing — Recurring Invoices — Detail",
  path: "/vendor/[vendorId]/billing/recurring/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation: "Read-only detail view of a single Recurring Invoice template, rendered via the shared RecordDetail component, with Edit and Delete actions in the header.",
  sourceFile: "src/app/vendor/[vendorId]/billing/recurring/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function RecurringInvoiceDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.vendorId, "billing-recurring", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields(
    "billing.recurring.detail",
    getRecurringInvoiceDetailFields(record),
    recurringInvoiceColumns
  );
  const timeline = getRecurringInvoiceTimeline();
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell topbarTitle="Recurring Invoices">
      <div>
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={recurringInvoiceRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Recurring invoice template detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/vendor/${params.vendorId}/billing/recurring`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link href={`/vendor/${params.vendorId}/billing/recurring/${params.recordId}/edit`} className="btn-outline">
                  Edit
                </Link>
                <DeleteBusinessRecordButton
                  vendorId={params.vendorId}
                  moduleSlug="billing-recurring"
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
