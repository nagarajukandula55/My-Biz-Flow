import { AppShell } from "@/components/AppShell";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { roleFormFields } from "@/lib/sample-data/roles";

registerPage({
  id: "roles.create",
  moduleSlug: "platform",
  title: "Roles — Create",
  path: "/vendor/[vendorId]/admin/roles/new",
  kind: "form",
  superAdminOnly: true,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Creation form for a new Role — name, description, and a multi-select of Access Groups. Demo stub, no backend wired up.",
  sourceFile: "src/app/vendor/[vendorId]/admin/roles/new/page.tsx",
});

export default async function NewRolePage({ params }: { params: { vendorId: string } }) {
  return (
    <AppShell topbarTitle="New Role">
      <SuperAdminGate>
        <div>
          <h1 className="font-display text-2xl font-bold text-text">New Role</h1>
          <p className="mt-1 text-sm text-text-muted">Select the Access Groups this Role includes.</p>
          <div className="mt-6">
            <RecordForm fields={roleFormFields} submitLabel="Create Role" />
          </div>
        </div>
      </SuperAdminGate>
    </AppShell>
  );
}
