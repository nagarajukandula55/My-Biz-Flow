import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import { getRealEstateDetailFields, getRealEstateTimeline, realEstateRelated, realEstateColumns } from "@/lib/sample-data/real-estate";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";

registerPage({
  id: "real-estate.detail",
  moduleSlug: "real-estate",
  title: "Real Estate — Detail",
  path: "/vendor/[vendorId]/real-estate/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single listing, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header.",
  sourceFile: "src/app/vendor/[vendorId]/real-estate/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function RealEstateDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const mod = await getModule("real-estate");
  const record = await getBusinessRecord(params.vendorId, "real-estate", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("real-estate.detail", getRealEstateDetailFields(record), realEstateColumns);
  const timeline = getRealEstateTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell topbarTitle={mod?.label ?? "Real Estate"}>
      <div>

        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={realEstateRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Listing detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/vendor/${params.vendorId}/real-estate`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/vendor/${params.vendorId}/real-estate/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
                <DeleteBusinessRecordButton vendorId={params.vendorId} moduleSlug="real-estate" recordKey={params.recordId} recordLabel={recordLabel} />
              </div>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
