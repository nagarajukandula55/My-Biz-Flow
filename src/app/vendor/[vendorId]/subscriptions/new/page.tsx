import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { subscriptionsFormFields } from "@/lib/sample-data/subscriptions";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "subscriptions.create",
  moduleSlug: "subscriptions",
  title: "Subscriptions / Membership — Create",
  path: "/vendor/[vendorId]/subscriptions/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new membership in the subscriptions module, built from the module's real field set via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/subscriptions/new/page.tsx",
});

export default async function NewSubscriptionsPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("subscriptions");
  const fields = await applyCustomizations("subscriptions.create", subscriptionsFormFields);

  return (
    <AppShell topbarTitle={`New Membership — ${mod?.label ?? "Subscriptions / Membership"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Membership</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new membership record for Subscriptions / Membership.</p>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Membership" />
        </div>
      </div>
    </AppShell>
  );
}
