import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { realEstateFormFields } from "@/lib/sample-data/real-estate";

registerPage({
  id: "real-estate.create",
  moduleSlug: "real-estate",
  title: "Real Estate — Create",
  path: "/vendor/[vendorId]/real-estate/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new listing in the real-estate module, built from the module's real field set via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/real-estate/new/page.tsx",
});

export default function NewRealEstatePage() {
  const mod = getModule("real-estate");

  return (
    <AppShell navGroups={buildVendorNavGroups("real-estate")} topbarTitle={`New Listing — ${mod?.label ?? "Real Estate"}`}>
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">New Listing</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new listing record for Real Estate.</p>
        <div className="mt-6">
          <RecordForm fields={realEstateFormFields} submitLabel="Create Listing" />
        </div>
      </div>
    </AppShell>
  );
}
