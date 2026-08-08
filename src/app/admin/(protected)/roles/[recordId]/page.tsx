import Link from "next/link";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { RecordDetail } from "@/components/RecordDetail";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { getRoleRecord, getRoleDetailFields, getRoleTimeline, roleRelated } from "@/lib/sample-data/roles";

registerPage({
  id: "platform.roles.detail",
  moduleSlug: "platform",
  title: "Roles — Detail",
  path: "/admin/roles/[recordId]",
  kind: "detail",
  superAdminOnly: true,
  customizableRegions: [{ key: "field-grid", label: "Detail field grid" }],
  explanation: "Read-only detail view of a single Role, with Edit and Delete actions.",
  sourceFile: "src/app/admin/(protected)/roles/[recordId]/page.tsx",
});

export default function RoleDetailPage({ params }: { params: { recordId: string } }) {
  const record = getRoleRecord(params.recordId);
  const fields = getRoleDetailFields(record);
  const timeline = getRoleTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Roles</h1>
        </div>
        <div className="p-6">
          <RecordDetail
            fields={fields}
            timeline={timeline}
            related={roleRelated}
            headerSlot={
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                  <p className="mt-1 text-xs text-text-muted">Role detail</p>
                </div>
                <div className="flex items-center gap-3">
                  <Link href="/admin/roles" className="btn-outline">
                    &larr; Back
                  </Link>
                  <Link href={`/admin/roles/${params.recordId}/edit`} className="btn-outline">
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
