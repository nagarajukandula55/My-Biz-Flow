import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { scVendorProfileFormFields } from "@/lib/sample-data/service-centre-vendor-profile";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "service-centre.vendor-profile.create",
  moduleSlug: "service-centre",
  title: "Vendor Profiles — Create",
  path: "/partner/[partnerId]/service-centre/vendor-profile/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new vendor profile entry, built via the shared RecordForm component.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/vendor-profile/new/page.tsx",
});

export default async function NewScVendorProfilePage({ params }: { params: { partnerId: string } }) {
  const fields = await applyCustomizations("service-centre.vendor-profile.create", scVendorProfileFormFields);

  return (
    <AppShell topbarTitle="New Vendor Profile">
      <div>
        <h1 className="font-display text-xl font-bold text-text">New Vendor Profile</h1>
        <p className="mt-1 text-xs text-text-muted">Onboard a new sub-vendor / outsourced repair partner.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Vendor Profile"
            action={createBusinessRecordAction.bind(null, params.partnerId, "service-centre-vendor-profile")}
          />
        </div>
      </div>
    </AppShell>
  );
}
