import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import {
  getCreditNoteDetailFields,
  getCreditNoteTimeline,
  creditNoteRelated,
  creditNoteColumns,
} from "@/lib/sample-data/billing-credit-notes";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";

registerPage({
  id: "billing.credit-notes.detail",
  moduleSlug: "billing",
  title: "Billing — Credit/Debit Notes — Detail",
  path: "/vendor/[vendorId]/billing/credit-notes/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation: "Read-only detail view of a single Credit Note / Debit Note, rendered via the shared RecordDetail component, with Edit, View document and Delete actions in the header.",
  sourceFile: "src/app/vendor/[vendorId]/billing/credit-notes/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function CreditNoteDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.vendorId, "billing-credit-notes", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields(
    "billing.credit-notes.detail",
    getCreditNoteDetailFields(record),
    creditNoteColumns
  );
  const timeline = getCreditNoteTimeline();
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell topbarTitle="Credit / Debit Notes">
      <div>
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={creditNoteRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">{String(record["noteType"] ?? "Note")} detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/vendor/${params.vendorId}/billing/credit-notes`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link href={`/vendor/${params.vendorId}/billing/credit-notes/${params.recordId}/document`} className="btn-outline">
                  View document
                </Link>
                <Link href={`/vendor/${params.vendorId}/billing/credit-notes/${params.recordId}/edit`} className="btn-outline">
                  Edit
                </Link>
                <DeleteBusinessRecordButton
                  vendorId={params.vendorId}
                  moduleSlug="billing-credit-notes"
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
