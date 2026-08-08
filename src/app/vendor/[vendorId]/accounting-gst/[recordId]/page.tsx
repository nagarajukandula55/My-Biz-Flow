import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import { getAccountingGstDetailFields, getAccountingGstTimeline, accountingGstRelated, accountingGstColumns } from "@/lib/sample-data/accounting-gst";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";

registerPage({
  id: "accounting-gst.detail",
  moduleSlug: "accounting-gst",
  title: "Accounting / GST Compliance — Detail",
  path: "/vendor/[vendorId]/accounting-gst/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single gst return, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header.",
  sourceFile: "src/app/vendor/[vendorId]/accounting-gst/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function AccountingGstDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const mod = await getModule("accounting-gst");
  const record = await getBusinessRecord(params.vendorId, "accounting-gst", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("accounting-gst.detail", getAccountingGstDetailFields(record), accountingGstColumns);
  const timeline = getAccountingGstTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell topbarTitle={mod?.label ?? "Accounting / GST Compliance"}>
      <div>

        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={accountingGstRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">GST Return detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/vendor/${params.vendorId}/accounting-gst`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/vendor/${params.vendorId}/accounting-gst/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
                <DeleteBusinessRecordButton vendorId={params.vendorId} moduleSlug="accounting-gst" recordKey={params.recordId} recordLabel={recordLabel} />
              </div>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
