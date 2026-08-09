import { AppShell } from "@/components/AppShell";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { notFound } from "next/navigation";
import { userFormFields } from "@/lib/sample-data/users";
import { getBusinessRecord } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "users.edit",
  moduleSlug: "platform",
  title: "Users — Edit",
  path: "/vendor/[vendorId]/admin/users/[recordId]/edit",
  kind: "form",
  superAdminOnly: true,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Pre-populated edit form for an existing vendor team member.",
  sourceFile: "src/app/vendor/[vendorId]/admin/users/[recordId]/edit/page.tsx",
});

export default async function EditUserPage({ params }: { params: { vendorId: string; recordId: string } }) {
  const record = await getBusinessRecord(params.vendorId, "users", params.recordId);
  if (!record) notFound();
  return (
    <AppShell topbarTitle="Edit User">
      <SuperAdminGate>
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Edit User</h1>
          <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
          <div className="mt-6">
            <RecordForm
              fields={userFormFields}
              initialValues={record}
              submitLabel="Save changes"
              action={updateBusinessRecordAction.bind(null, params.vendorId, "users", params.recordId)}
            />
          </div>
        </div>
      </SuperAdminGate>
    </AppShell>
  );
}
