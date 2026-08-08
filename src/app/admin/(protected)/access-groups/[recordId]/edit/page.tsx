import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { accessGroupFormFields, getAccessGroupRecord, type PagePermission } from "@/lib/sample-data/access-groups";
import { getAssignablePagesByModule, defaultPermissionsForModules } from "@/lib/designer/accessGroupPermissions";
import { AccessGroupPermissionsEditor } from "../../AccessGroupPermissionsEditor";

registerPage({
  id: "platform.access-groups.edit",
  moduleSlug: "platform",
  title: "Access Groups — Edit",
  path: "/admin/access-groups/[recordId]/edit",
  kind: "form",
  superAdminOnly: true,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Pre-populated edit form for an existing Access Group (demo stub, no persistence yet).",
  sourceFile: "src/app/admin/(protected)/access-groups/[recordId]/edit/page.tsx",
});

export default function EditAccessGroupPage({ params }: { params: { recordId: string } }) {
  const record = getAccessGroupRecord(params.recordId);
  const seededPermissions = (record["pagePermissions"] as PagePermission[] | undefined) ?? [];
  const initialPermissions =
    seededPermissions.length > 0
      ? seededPermissions
      : defaultPermissionsForModules((record["modules"] as string[] | undefined) ?? []);
  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Edit Access Group</h1>
        </div>
        <div className="p-6">
          <p className="mb-6 text-sm text-text-muted">{String(record["id"])}</p>
          <RecordForm fields={accessGroupFormFields} initialValues={record} submitLabel="Save changes" />
          <div className="mt-8">
            <AccessGroupPermissionsEditor
              pagesByModule={getAssignablePagesByModule()}
              initialPermissions={initialPermissions}
            />
          </div>
        </div>
      </div>
    </SuperAdminGate>
  );
}
