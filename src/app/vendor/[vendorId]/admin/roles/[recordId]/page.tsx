import { AppShell } from "@/components/AppShell";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { buildVendorAdminNavGroups } from "@/lib/designer/vendorAdminNav";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RecordDetail } from "@/components/RecordDetail";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { getRoleRecord, getRoleDetailFields, getRoleTimeline, roleRelated } from "@/lib/sample-data/roles";

registerPage({
  id: "roles.detail",
  moduleSlug: "platform",
  title: "Roles — Detail",
  path: "/vendor/[vendorId]/admin/roles/[recordId]",
  kind: "detail",
  superAdminOnly: true,
  customizableRegions: [{ key: "field-grid", label: "Detail field grid" }],
  explanation: "Read-only detail view of a single Role, with Edit and Delete actions.",
  sourceFile: "src/app/vendor/[vendorId]/admin/roles/[recordId]/page.tsx",
});

export default async function RoleDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const record = getRoleRecord(params.recordId);
  const fields = getRoleDetailFields(record);
  const timeline = getRoleTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell vendorId={params.vendorId} navGroups={await buildVendorAdminNavGroups("roles")} topbarTitle="Roles">
      <SuperAdminGate>
        <div>
          <Link href={`/vendor/${params.vendorId}/admin/roles`} className="text-sm font-semibold text-teal hover:underline">
            &larr; Back to Roles
          </Link>
          <RecordDetail
            fields={fields}
            timeline={timeline}
            related={roleRelated}
            headerSlot={
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-2xl font-bold text-text">{recordLabel}</h1>
                  <p className="mt-1 text-sm text-text-muted">Role detail</p>
                </div>
                <div className="flex items-center gap-3">
                  <Link href={`/vendor/${params.vendorId}/admin/roles/${params.recordId}/edit`} className="btn-outline">
                    Edit
                  </Link>
                  <ConfirmDeleteDialog recordLabel={recordLabel} />
                </div>
              </div>
            }
          />
        </div>
      </SuperAdminGate>
    </AppShell>
  );
}
