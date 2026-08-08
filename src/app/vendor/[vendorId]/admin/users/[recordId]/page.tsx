import { AppShell } from "@/components/AppShell";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { buildVendorAdminNavGroups } from "@/lib/designer/vendorAdminNav";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RecordDetail } from "@/components/RecordDetail";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { getUserRecord, getUserDetailFields, getUserTimeline, userRelated } from "@/lib/sample-data/users";

registerPage({
  id: "users.detail",
  moduleSlug: "platform",
  title: "Users — Detail",
  path: "/vendor/[vendorId]/admin/users/[recordId]",
  kind: "detail",
  superAdminOnly: true,
  customizableRegions: [{ key: "field-grid", label: "Detail field grid" }],
  explanation: "Read-only detail view of a single vendor team member, with Edit and Delete actions.",
  sourceFile: "src/app/vendor/[vendorId]/admin/users/[recordId]/page.tsx",
});

export default function UserDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const record = getUserRecord(params.recordId);
  const fields = getUserDetailFields(record);
  const timeline = getUserTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell navGroups={buildVendorAdminNavGroups("users")} topbarTitle="Users">
      <SuperAdminGate>
        <div>
          <Link href={`/vendor/${params.vendorId}/admin/users`} className="text-sm font-semibold text-teal hover:underline">
            &larr; Back to Users
          </Link>
          <RecordDetail
            fields={fields}
            timeline={timeline}
            related={userRelated}
            headerSlot={
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-2xl font-bold text-text">{recordLabel}</h1>
                  <p className="mt-1 text-sm text-text-muted">User detail</p>
                </div>
                <div className="flex items-center gap-3">
                  <Link href={`/vendor/${params.vendorId}/admin/users/${params.recordId}/edit`} className="btn-outline">
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
