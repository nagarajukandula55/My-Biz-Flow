import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import { getLogisticsFleetDetailFields, getLogisticsFleetTimeline, logisticsFleetRelated, logisticsFleetColumns } from "@/lib/sample-data/logistics-fleet";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";

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

export const dynamic = "force-dynamic";

export default async function LogisticsFleetDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const mod = await getModule("logistics-fleet");
  const record = await getBusinessRecord(params.vendorId, "logistics-fleet", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("logistics-fleet.detail", getLogisticsFleetDetailFields(record), logisticsFleetColumns);
  const timeline = getLogisticsFleetTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell topbarTitle={mod?.label ?? "Logistics / Fleet"}>
      <div>

        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={logisticsFleetRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Shipment detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/vendor/${params.vendorId}/logistics-fleet`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/vendor/${params.vendorId}/logistics-fleet/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
                <DeleteBusinessRecordButton vendorId={params.vendorId} moduleSlug="logistics-fleet" recordKey={params.recordId} recordLabel={recordLabel} />
              </div>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
