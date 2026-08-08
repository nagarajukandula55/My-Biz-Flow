import { AppShell } from "@/components/AppShell";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { buildVendorAdminNavGroups } from "@/lib/designer/vendorAdminNav";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { roleFormFields, getRoleRecord } from "@/lib/sample-data/roles";

registerPage({
  id: "roles.edit",
  moduleSlug: "platform",
  title: "Roles — Edit",
  path: "/vendor/[vendorId]/admin/roles/[recordId]/edit",
  kind: "form",
  superAdminOnly: true,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Pre-populated edit form for an existing Role (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/admin/roles/[recordId]/edit/page.tsx",
});

export default async function EditRolePage({ params }: { params: { recordId: string } }) {
  const record = getRoleRecord(params.recordId);
  return (
    <AppShell navGroups={await buildVendorAdminNavGroups("roles")} topbarTitle="Edit Role">
      <SuperAdminGate>
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Edit Role</h1>
          <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
          <div className="mt-6">
            <RecordForm fields={roleFormFields} initialValues={record} submitLabel="Save changes" />
          </div>
        </div>
      </SuperAdminGate>
    </AppShell>
  );
}
