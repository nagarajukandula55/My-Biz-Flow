import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { scProfileFormFields } from "@/lib/sample-data/service-centre-sc-profile";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "service-centre.sc-profile.create",
  moduleSlug: "service-centre",
  title: "SC Profiles — Create",
  path: "/partner/[partnerId]/service-centre/sc-profile/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new SC profile entry, built via the shared RecordForm component.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/sc-profile/new/page.tsx",
});

export default async function NewScProfilePage({ params }: { params: { partnerId: string } }) {
  const fields = await applyCustomizations("service-centre.sc-profile.create", scProfileFormFields);

  return (
    <AppShell topbarTitle="New SC Profile">
      <div>
        <h1 className="font-display text-xl font-bold text-text">New SC Profile</h1>
        <p className="mt-1 text-xs text-text-muted">Onboard a new sub-SC / outsourced repair partner.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create SC Profile"
            action={createBusinessRecordAction.bind(null, params.partnerId, "service-centre-sc-profile")}
          />
        </div>
      </div>
    </AppShell>
  );
}
