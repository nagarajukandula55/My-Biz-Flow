import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RecordDetail } from "@/components/RecordDetail";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { getAccountingGstRecord, getAccountingGstDetailFields, getAccountingGstTimeline, accountingGstRelated, accountingGstColumns } from "@/lib/sample-data/accounting-gst";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";

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

export default function AccountingGstDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const mod = getModule("accounting-gst");
  const record = getAccountingGstRecord(params.recordId);
  const fields = applyCustomizationsToDetailFields("accounting-gst.detail", getAccountingGstDetailFields(record), accountingGstColumns);
  const timeline = getAccountingGstTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell navGroups={buildVendorNavGroups("accounting-gst")} topbarTitle={mod?.label ?? "Accounting / GST Compliance"}>
      <div>
        <Link
          href={`/vendor/${params.vendorId}/accounting-gst`}
          className="text-sm font-semibold text-teal hover:underline"
        >
          &larr; Back to Accounting / GST Compliance
        </Link>

        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={accountingGstRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-sm text-text-muted">GST Return detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/vendor/${params.vendorId}/accounting-gst/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
                <ConfirmDeleteDialog recordLabel={recordLabel} />
              </div>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
