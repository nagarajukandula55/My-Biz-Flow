import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RecordDetail } from "@/components/RecordDetail";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { getLogisticsFleetRecord, getLogisticsFleetDetailFields, getLogisticsFleetTimeline, logisticsFleetRelated, logisticsFleetColumns } from "@/lib/sample-data/logistics-fleet";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";

registerPage({
  id: "logistics-fleet.detail",
  moduleSlug: "logistics-fleet",
  title: "Logistics / Fleet — Detail",
  path: "/vendor/[vendorId]/logistics-fleet/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single shipment, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header.",
  sourceFile: "src/app/vendor/[vendorId]/logistics-fleet/[recordId]/page.tsx",
});

export default function LogisticsFleetDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const mod = getModule("logistics-fleet");
  const record = getLogisticsFleetRecord(params.recordId);
  const fields = applyCustomizationsToDetailFields("logistics-fleet.detail", getLogisticsFleetDetailFields(record), logisticsFleetColumns);
  const timeline = getLogisticsFleetTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell navGroups={buildVendorNavGroups("logistics-fleet")} topbarTitle={mod?.label ?? "Logistics / Fleet"}>
      <div>
        <Link
          href={`/vendor/${params.vendorId}/logistics-fleet`}
          className="text-sm font-semibold text-teal hover:underline"
        >
          &larr; Back to Logistics / Fleet
        </Link>

        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={logisticsFleetRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-sm text-text-muted">Shipment detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/vendor/${params.vendorId}/logistics-fleet/${params.recordId}/edit`}
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
