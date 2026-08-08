import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { vendorTypeFormFields } from "@/lib/sample-data/vendor-types";

registerPage({
  id: "platform.vendor-types.create",
  moduleSlug: "platform",
  title: "Vendor Types — Create",
  path: "/admin/vendor-types/new",
  kind: "form",
  superAdminOnly: true,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Creation form for a new Vendor Type — default modules, assignable Roles, and available Plans. Demo stub, no backend wired up.",
  sourceFile: "src/app/admin/(protected)/vendor-types/new/page.tsx",
});

export default function NewVendorTypePage() {
  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">New Vendor Type</h1>
        </div>
        <div className="p-6">
          <RecordForm fields={vendorTypeFormFields} submitLabel="Create Vendor Type" />
        </div>
      </div>
    </SuperAdminGate>
  );
}
