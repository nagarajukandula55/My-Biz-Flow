import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import {
  getServiceCentreDetailFields,
  getServiceCentreTimeline,
  serviceCentreRelated,
  serviceCentreColumns,
  getWorkorderLifecycle,
} from "@/lib/sample-data/service-centre";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";
import { WorkorderLifecycle } from "./WorkorderLifecycle";

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

export const dynamic = "force-dynamic";

export default async function ServiceCentreDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const mod = await getModule("service-centre");
  const record = await getBusinessRecord(params.vendorId, "service-centre", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("service-centre.detail", getServiceCentreDetailFields(record), serviceCentreColumns);
  const timeline = getServiceCentreTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);
  const lifecycle = getWorkorderLifecycle(recordLabel);

  return (
    <AppShell topbarTitle={mod?.label ?? "Service Centre"}>
      <div>
        <WorkorderLifecycle
          vendorId={params.vendorId}
          workorderId={recordLabel}
          initialStage={lifecycle.stage}
          initialPartLines={lifecycle.partLines}
          initialServiceLines={lifecycle.serviceLines}
          brandName={lifecycle.brandName}
          modelName={lifecycle.modelName}
        />

        <div className="mt-8">
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={serviceCentreRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Workorder detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/vendor/${params.vendorId}/service-centre`} className="btn-outline">
                  &larr; Back
                </Link>
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
                <DeleteBusinessRecordButton
                  vendorId={params.vendorId}
                  moduleSlug="service-centre"
                  recordKey={params.recordId}
                  recordLabel={recordLabel}
                />
              </div>
            </div>
          }
        />
        </div>
      </div>
    </AppShell>
  );
}
