import { AppShell } from "@/components/AppShell";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { accessGroupFormFields } from "@/lib/sample-data/access-groups";

registerPage({
  id: "access-groups.create",
  moduleSlug: "platform",
  title: "Access Groups — Create",
  path: "/vendor/[vendorId]/admin/access-groups/new",
  kind: "form",
  superAdminOnly: true,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation:
    "Creation form for a new Access Group — name, description, and a multi-select checkbox list of module slugs from the canonical MODULES registry. Demo stub, no backend wired up.",
  sourceFile: "src/app/vendor/[vendorId]/admin/access-groups/new/page.tsx",
});

export default async function NewAccessGroupPage({ params }: { params: { vendorId: string } }) {
  return (
    <AppShell topbarTitle="New Access Group">
      <SuperAdminGate>
        <div>
          <h1 className="font-display text-2xl font-bold text-text">New Access Group</h1>
          <p className="mt-1 text-sm text-text-muted">Select the modules this Access Group grants.</p>
          <div className="mt-6">
            <RecordForm fields={accessGroupFormFields} submitLabel="Create Access Group" />
          </div>
        </div>
      </SuperAdminGate>
    </AppShell>
  );
}
