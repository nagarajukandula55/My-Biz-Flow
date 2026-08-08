import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import {
  getScModelDetailFields,
  getScModelTimeline,
  scModelRelated,
  scModelColumns,
} from "@/lib/sample-data/service-centre-models";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";

registerPage({
  id: "service-centre.models.detail",
  moduleSlug: "service-centre",
  title: "Device Models — Detail",
  path: "/vendor/[vendorId]/service-centre/models/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation: "Read-only detail view of a single model.",
  sourceFile: "src/app/vendor/[vendorId]/service-centre/models/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ScModelDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.vendorId, "service-centre-models", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields(
    "service-centre.models.detail",
    getScModelDetailFields(record),
    scModelColumns
  );
  const timeline = getScModelTimeline(record);
  const recordLabel = String(record["name"] ?? params.recordId);

  return (
    <AppShell topbarTitle="Device Models">
      <div>
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={scModelRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Model detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/vendor/${params.vendorId}/service-centre/models`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/vendor/${params.vendorId}/service-centre/models/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
              </div>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
