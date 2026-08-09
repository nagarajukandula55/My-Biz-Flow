import { AppShell } from "@/components/AppShell";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { userFormFields } from "@/lib/sample-data/users";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "users.create",
  moduleSlug: "platform",
  title: "Users — Create",
  path: "/vendor/[vendorId]/admin/users/new",
  kind: "form",
  superAdminOnly: true,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Invite/create form for a new vendor team member — name, email, role, status.",
  sourceFile: "src/app/vendor/[vendorId]/admin/users/new/page.tsx",
});

export default async function NewUserPage({ params }: { params: { vendorId: string } }) {
  return (
    <AppShell topbarTitle="New User">
      <SuperAdminGate>
        <div>
          <h1 className="font-display text-2xl font-bold text-text">New User</h1>
          <p className="mt-1 text-sm text-text-muted">Invite a new team member and assign their Role.</p>
          <div className="mt-6">
            <RecordForm
              fields={userFormFields}
              submitLabel="Create User"
              action={createBusinessRecordAction.bind(null, params.vendorId, "users")}
            />
          </div>
        </div>
      </SuperAdminGate>
    </AppShell>
  );
}
