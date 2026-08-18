import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import {
  getGstItcDetailFields,
  getGstItcTimeline,
  gstItcRelated,
  gstItcColumns,
} from "@/lib/sample-data/accounting-gst-itc";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";

registerPage({
  id: "accounting-gst.itc.detail",
  moduleSlug: "accounting-gst",
  title: "GST — ITC Register — Detail",
  path: "/vendor/[vendorId]/accounting-gst/itc/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation: "Read-only detail view of a single ITC entry, rendered via the shared RecordDetail component, with Edit and Delete actions in the header.",
  sourceFile: "src/app/vendor/[vendorId]/accounting-gst/itc/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function GstItcDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.vendorId, "accounting-gst-itc", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields(
    "accounting-gst.itc.detail",
    getGstItcDetailFields(record),
    gstItcColumns
  );
  const timeline = getGstItcTimeline();
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell topbarTitle="ITC Register">
      <div>
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={gstItcRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">ITC entry detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/vendor/${params.vendorId}/accounting-gst/itc`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link href={`/vendor/${params.vendorId}/accounting-gst/itc/${params.recordId}/edit`} className="btn-outline">
                  Edit
                </Link>
                <DeleteBusinessRecordButton
                  vendorId={params.vendorId}
                  moduleSlug="accounting-gst-itc"
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
