import Link from "next/link";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { RecordDetail } from "@/components/RecordDetail";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { getPlanRecord, getPlanDetailFields, getPlanTimeline, planRelated } from "@/lib/sample-data/plans";

registerPage({
  id: "platform.plans.detail",
  moduleSlug: "platform",
  title: "Plans — Detail",
  path: "/admin/plans/[recordId]",
  kind: "detail",
  superAdminOnly: true,
  customizableRegions: [{ key: "field-grid", label: "Detail field grid" }],
  explanation: "Read-only detail view of a single Plan, with Edit and Delete actions.",
  sourceFile: "src/app/admin/(protected)/plans/[recordId]/page.tsx",
});

export default function PlanDetailPage({ params }: { params: { recordId: string } }) {
  const record = getPlanRecord(params.recordId);
  const fields = getPlanDetailFields(record);
  const timeline = getPlanTimeline(record);
  const recordLabel = String(record["name"] ?? params.recordId);

  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Plans</h1>
        </div>
        <div className="p-6">
          <RecordDetail
            fields={fields}
            timeline={timeline}
            related={planRelated}
            headerSlot={
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                  <p className="mt-1 text-xs text-text-muted">Plan detail</p>
                </div>
                <div className="flex items-center gap-3">
                  <Link href="/admin/plans" className="btn-outline">
                    &larr; Back
                  </Link>
                  <Link href={`/admin/plans/${params.recordId}/edit`} className="btn-outline">
                    Edit
                  </Link>
                  <ConfirmDeleteDialog recordLabel={recordLabel} />
                </div>
              </div>
            }
          />
        </div>
      </div>
    </SuperAdminGate>
  );
}
