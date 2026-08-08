import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RecordDetail } from "@/components/RecordDetail";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { getServiceCentreRecord, getServiceCentreDetailFields, getServiceCentreTimeline, serviceCentreRelated, serviceCentreColumns } from "@/lib/sample-data/service-centre";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";

registerPage({
  id: "service-centre.detail",
  moduleSlug: "service-centre",
  title: "Service Centre — Detail",
  path: "/vendor/[vendorId]/service-centre/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single workorder, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header.",
  sourceFile: "src/app/vendor/[vendorId]/service-centre/[recordId]/page.tsx",
});

export default async function ServiceCentreDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const mod = await getModule("service-centre");
  const record = getServiceCentreRecord(params.recordId);
  const fields = await applyCustomizationsToDetailFields("service-centre.detail", getServiceCentreDetailFields(record), serviceCentreColumns);
  const timeline = getServiceCentreTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell navGroups={await buildVendorNavGroups("service-centre")} topbarTitle={mod?.label ?? "Service Centre"}>
      <div>
        <Link
          href={`/vendor/${params.vendorId}/service-centre`}
          className="text-sm font-semibold text-teal hover:underline"
        >
          &larr; Back to Service Centre
        </Link>

        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={serviceCentreRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-sm text-text-muted">Workorder detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/vendor/${params.vendorId}/service-centre/${params.recordId}/document`}
                  className="btn-outline"
                >
                  View document
                </Link>
                <Link
                  href={`/vendor/${params.vendorId}/service-centre/${params.recordId}/edit`}
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
