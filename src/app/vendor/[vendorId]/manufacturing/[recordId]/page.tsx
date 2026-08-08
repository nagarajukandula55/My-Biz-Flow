import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { buildVendorAdminNavGroups } from "@/lib/designer/vendorAdminNav";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RecordDetail } from "@/components/RecordDetail";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { getManufacturingRecord, getManufacturingDetailFields, getManufacturingTimeline, manufacturingRelated, manufacturingColumns } from "@/lib/sample-data/manufacturing";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";

registerPage({
  id: "manufacturing.detail",
  moduleSlug: "manufacturing",
  title: "Manufacturing / Production — Detail",
  path: "/vendor/[vendorId]/manufacturing/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single work order, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header.",
  sourceFile: "src/app/vendor/[vendorId]/manufacturing/[recordId]/page.tsx",
});

export default async function ManufacturingDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const mod = await getModule("manufacturing");
  const record = getManufacturingRecord(params.recordId);
  const fields = await applyCustomizationsToDetailFields("manufacturing.detail", getManufacturingDetailFields(record), manufacturingColumns);
  const timeline = getManufacturingTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell vendorId={params.vendorId} navGroups={await buildVendorAdminNavGroups(undefined, "manufacturing")} topbarTitle={mod?.label ?? "Manufacturing / Production"}>
      <div>
        <Link
          href={`/vendor/${params.vendorId}/manufacturing`}
          className="text-sm font-semibold text-teal hover:underline"
        >
          &larr; Back to Manufacturing / Production
        </Link>

        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={manufacturingRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-sm text-text-muted">Work Order detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/vendor/${params.vendorId}/manufacturing/${params.recordId}/edit`}
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
