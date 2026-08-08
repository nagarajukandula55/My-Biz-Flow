import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { roleFormFields, getRoleRecord } from "@/lib/sample-data/roles";

registerPage({
  id: "platform.roles.edit",
  moduleSlug: "platform",
  title: "Roles — Edit",
  path: "/admin/roles/[recordId]/edit",
  kind: "form",
  superAdminOnly: true,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Pre-populated edit form for an existing Role (demo stub, no persistence yet).",
  sourceFile: "src/app/admin/(protected)/roles/[recordId]/edit/page.tsx",
});

export default function EditRolePage({ params }: { params: { recordId: string } }) {
  const record = getRoleRecord(params.recordId);
  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Edit Role</h1>
        </div>
        <div className="p-6">
          <p className="mb-6 text-sm text-text-muted">{String(record["id"])}</p>
          <RecordForm fields={roleFormFields} initialValues={record} submitLabel="Save changes" />
        </div>
      </div>
    </SuperAdminGate>
  );
}
