import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { roleFormFields } from "@/lib/sample-data/roles";

registerPage({
  id: "platform.roles.create",
  moduleSlug: "platform",
  title: "Roles — Create",
  path: "/admin/roles/new",
  kind: "form",
  superAdminOnly: true,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Creation form for a new Role — name, description, and the Access Groups it bundles. Demo stub, no backend wired up.",
  sourceFile: "src/app/admin/(protected)/roles/new/page.tsx",
});

export default function NewRolePage() {
  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">New Role</h1>
        </div>
        <div className="p-6">
          <p className="mb-6 text-sm text-text-muted">Select the Access Groups this Role bundles.</p>
          <RecordForm fields={roleFormFields} submitLabel="Create Role" />
        </div>
      </div>
    </SuperAdminGate>
  );
}
