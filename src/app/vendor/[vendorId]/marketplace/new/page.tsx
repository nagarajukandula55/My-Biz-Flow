import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { marketplaceFormFields } from "@/lib/sample-data/marketplace";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "marketplace.create",
  moduleSlug: "marketplace",
  title: "Marketplace / Vendor Aggregator — Create",
  path: "/vendor/[vendorId]/marketplace/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new vendor listing in the marketplace module, built from the module's real field set via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/marketplace/new/page.tsx",
});

export default function NewMarketplacePage() {
  const mod = getModule("marketplace");
  const fields = applyCustomizations("marketplace.create", marketplaceFormFields);

  return (
    <AppShell navGroups={buildVendorNavGroups("marketplace")} topbarTitle={`New Vendor Listing — ${mod?.label ?? "Marketplace / Vendor Aggregator"}`}>
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">New Vendor Listing</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new vendor listing record for Marketplace / Vendor Aggregator.</p>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Vendor Listing" />
        </div>
      </div>
    </AppShell>
  );
}
