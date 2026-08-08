import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RecordDetail } from "@/components/RecordDetail";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { getRealEstateRecord, getRealEstateDetailFields, getRealEstateTimeline, realEstateRelated, realEstateColumns } from "@/lib/sample-data/real-estate";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";

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

export default function RealEstateDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const mod = getModule("real-estate");
  const record = getRealEstateRecord(params.recordId);
  const fields = applyCustomizationsToDetailFields("real-estate.detail", getRealEstateDetailFields(record), realEstateColumns);
  const timeline = getRealEstateTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell navGroups={buildVendorNavGroups("real-estate")} topbarTitle={mod?.label ?? "Real Estate"}>
      <div>
        <Link
          href={`/vendor/${params.vendorId}/real-estate`}
          className="text-sm font-semibold text-teal hover:underline"
        >
          &larr; Back to Real Estate
        </Link>

        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={realEstateRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-sm text-text-muted">Listing detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/vendor/${params.vendorId}/real-estate/${params.recordId}/edit`}
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
