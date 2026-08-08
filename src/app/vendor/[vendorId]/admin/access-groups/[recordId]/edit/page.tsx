import { AppShell } from "@/components/AppShell";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { buildVendorAdminNavGroups } from "@/lib/designer/vendorAdminNav";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { accessGroupFormFields, getAccessGroupRecord } from "@/lib/sample-data/access-groups";

registerPage({
  id: "access-groups.edit",
  moduleSlug: "platform",
  title: "Access Groups — Edit",
  path: "/vendor/[vendorId]/admin/access-groups/[recordId]/edit",
  kind: "form",
  superAdminOnly: true,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Pre-populated edit form for an existing Access Group (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/admin/access-groups/[recordId]/edit/page.tsx",
});

export default function EditAccessGroupPage({ params }: { params: { recordId: string } }) {
  const record = getAccessGroupRecord(params.recordId);
  return (
    <AppShell navGroups={buildVendorAdminNavGroups("access-groups")} topbarTitle="Edit Access Group">
      <SuperAdminGate>
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Edit Access Group</h1>
          <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
          <div className="mt-6">
            <RecordForm fields={accessGroupFormFields} initialValues={record} submitLabel="Save changes" />
          </div>
        </div>
      </SuperAdminGate>
    </AppShell>
  );
}
