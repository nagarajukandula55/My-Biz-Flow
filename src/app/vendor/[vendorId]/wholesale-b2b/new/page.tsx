import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { wholesaleB2bFormFields } from "@/lib/sample-data/wholesale-b2b";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "wholesale-b2b.create",
  moduleSlug: "wholesale-b2b",
  title: "Wholesale / Distributor B2B — Create",
  path: "/vendor/[vendorId]/wholesale-b2b/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new order in the wholesale-b2b module, built from the module's real field set via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/wholesale-b2b/new/page.tsx",
});

export default function NewWholesaleB2bPage() {
  const mod = getModule("wholesale-b2b");
  const fields = applyCustomizations("wholesale-b2b.create", wholesaleB2bFormFields);

  return (
    <AppShell navGroups={buildVendorNavGroups("wholesale-b2b")} topbarTitle={`New Order — ${mod?.label ?? "Wholesale / Distributor B2B"}`}>
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">New Order</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new order record for Wholesale / Distributor B2B.</p>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Order" />
        </div>
      </div>
    </AppShell>
  );
}
