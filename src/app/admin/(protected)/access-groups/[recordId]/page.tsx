import Link from "next/link";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { RecordDetail } from "@/components/RecordDetail";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import {
  getAccessGroupRecord,
  getAccessGroupDetailFields,
  getAccessGroupTimeline,
  accessGroupRelated,
} from "@/lib/sample-data/access-groups";

registerPage({
  id: "platform.access-groups.detail",
  moduleSlug: "platform",
  title: "Access Groups — Detail",
  path: "/admin/access-groups/[recordId]",
  kind: "detail",
  superAdminOnly: true,
  customizableRegions: [{ key: "field-grid", label: "Detail field grid" }],
  explanation: "Read-only detail view of a single Access Group, with Edit and Delete actions.",
  sourceFile: "src/app/admin/(protected)/access-groups/[recordId]/page.tsx",
});

export default function AccessGroupDetailPage({ params }: { params: { recordId: string } }) {
  const record = getAccessGroupRecord(params.recordId);
  const fields = getAccessGroupDetailFields(record);
  const timeline = getAccessGroupTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Access Groups</h1>
        </div>
        <div className="p-6">
          <RecordDetail
            fields={fields}
            timeline={timeline}
            related={accessGroupRelated}
            headerSlot={
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                  <p className="mt-1 text-xs text-text-muted">Access Group detail</p>
                </div>
                <div className="flex items-center gap-3">
                  <Link href="/admin/access-groups" className="btn-outline">
                    &larr; Back
                  </Link>
                  <Link href={`/admin/access-groups/${params.recordId}/edit`} className="btn-outline">
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
