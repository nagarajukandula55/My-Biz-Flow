import { AppShell } from "@/components/AppShell";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { buildVendorAdminNavGroups } from "@/lib/designer/vendorAdminNav";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { userFormFields, getUserRecord } from "@/lib/sample-data/users";

registerPage({
  id: "users.edit",
  moduleSlug: "platform",
  title: "Users — Edit",
  path: "/vendor/[vendorId]/admin/users/[recordId]/edit",
  kind: "form",
  superAdminOnly: true,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Pre-populated edit form for an existing vendor team member (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/admin/users/[recordId]/edit/page.tsx",
});

export default async function EditUserPage({ params }: { params: { recordId: string } }) {
  const record = getUserRecord(params.recordId);
  return (
    <AppShell navGroups={await buildVendorAdminNavGroups("users")} topbarTitle="Edit User">
      <SuperAdminGate>
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Edit User</h1>
          <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
          <div className="mt-6">
            <RecordForm fields={userFormFields} initialValues={record} submitLabel="Save changes" />
          </div>
        </div>
      </SuperAdminGate>
    </AppShell>
  );
}
