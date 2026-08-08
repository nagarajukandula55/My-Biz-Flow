import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { buildVendorAdminNavGroups } from "@/lib/designer/vendorAdminNav";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RecordDetail } from "@/components/RecordDetail";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { getAmcFieldServiceRecord, getAmcFieldServiceDetailFields, getAmcFieldServiceTimeline, amcFieldServiceRelated, amcFieldServiceColumns } from "@/lib/sample-data/amc-field-service";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";

registerPage({
  id: "amc-field-service.detail",
  moduleSlug: "amc-field-service",
  title: "AMC / Field Service — Detail",
  path: "/vendor/[vendorId]/amc-field-service/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single contract, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header.",
  sourceFile: "src/app/vendor/[vendorId]/amc-field-service/[recordId]/page.tsx",
});

export default async function AmcFieldServiceDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const mod = await getModule("amc-field-service");
  const record = getAmcFieldServiceRecord(params.recordId);
  const fields = await applyCustomizationsToDetailFields("amc-field-service.detail", getAmcFieldServiceDetailFields(record), amcFieldServiceColumns);
  const timeline = getAmcFieldServiceTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell vendorId={params.vendorId} navGroups={await buildVendorAdminNavGroups(undefined, "amc-field-service")} topbarTitle={mod?.label ?? "AMC / Field Service"}>
      <div>
        <Link
          href={`/vendor/${params.vendorId}/amc-field-service`}
          className="text-sm font-semibold text-teal hover:underline"
        >
          &larr; Back to AMC / Field Service
        </Link>

        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={amcFieldServiceRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-sm text-text-muted">Contract detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/vendor/${params.vendorId}/amc-field-service/${params.recordId}/document`}
                  className="btn-outline"
                >
                  View document
                </Link>
                <Link
                  href={`/vendor/${params.vendorId}/amc-field-service/${params.recordId}/edit`}
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
