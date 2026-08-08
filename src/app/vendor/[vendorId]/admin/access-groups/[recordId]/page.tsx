import { AppShell } from "@/components/AppShell";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { buildVendorAdminNavGroups } from "@/lib/designer/vendorAdminNav";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RecordDetail } from "@/components/RecordDetail";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import {
  getAccessGroupRecord,
  getAccessGroupDetailFields,
  getAccessGroupTimeline,
  accessGroupRelated,
} from "@/lib/sample-data/access-groups";

registerPage({
  id: "access-groups.detail",
  moduleSlug: "platform",
  title: "Access Groups — Detail",
  path: "/vendor/[vendorId]/admin/access-groups/[recordId]",
  kind: "detail",
  superAdminOnly: true,
  customizableRegions: [{ key: "field-grid", label: "Detail field grid" }],
  explanation: "Read-only detail view of a single Access Group, with Edit and Delete actions.",
  sourceFile: "src/app/vendor/[vendorId]/admin/access-groups/[recordId]/page.tsx",
});

export default async function AccessGroupDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const record = getAccessGroupRecord(params.recordId);
  const fields = getAccessGroupDetailFields(record);
  const timeline = getAccessGroupTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell vendorId={params.vendorId} navGroups={await buildVendorAdminNavGroups("access-groups")} topbarTitle="Access Groups">
      <SuperAdminGate>
        <div>
          <Link
            href={`/vendor/${params.vendorId}/admin/access-groups`}
            className="text-sm font-semibold text-teal hover:underline"
          >
            &larr; Back to Access Groups
          </Link>
          <RecordDetail
            fields={fields}
            timeline={timeline}
            related={accessGroupRelated}
            headerSlot={
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-2xl font-bold text-text">{recordLabel}</h1>
                  <p className="mt-1 text-sm text-text-muted">Access Group detail</p>
                </div>
                <div className="flex items-center gap-3">
                  <Link href={`/vendor/${params.vendorId}/admin/access-groups/${params.recordId}/edit`} className="btn-outline">
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
