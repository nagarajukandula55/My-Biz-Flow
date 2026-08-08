import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { accessGroupFormFields } from "@/lib/sample-data/access-groups";
import { getAssignablePagesByModule } from "@/lib/designer/accessGroupPermissions";
import { AccessGroupPermissionsEditor } from "../AccessGroupPermissionsEditor";

registerPage({
  id: "platform.access-groups.create",
  moduleSlug: "platform",
  title: "Access Groups — Create",
  path: "/admin/access-groups/new",
  kind: "form",
  superAdminOnly: true,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation:
    "Creation form for a new Access Group — name, description, and a multi-select checkbox list of module slugs from the canonical MODULES registry. Demo stub, no backend wired up.",
  sourceFile: "src/app/admin/(protected)/access-groups/new/page.tsx",
});

export default function NewAccessGroupPage() {
  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">New Access Group</h1>
        </div>
        <div className="p-6">
          <p className="mb-6 text-sm text-text-muted">Name and describe the Access Group, then pick exact pages and actions below.</p>
          <RecordForm fields={accessGroupFormFields} submitLabel="Create Access Group" />
          <div className="mt-8">
            <AccessGroupPermissionsEditor pagesByModule={getAssignablePagesByModule()} />
          </div>
        </div>
      </div>
    </SuperAdminGate>
  );
}
