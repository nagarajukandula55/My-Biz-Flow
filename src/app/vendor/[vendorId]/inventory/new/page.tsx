import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { inventoryFormFields } from "@/lib/sample-data/inventory";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "inventory.create",
  moduleSlug: "inventory",
  title: "Inventory / Warehouse — Create",
  path: "/vendor/[vendorId]/inventory/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new stock item in the inventory module, built from the module's real field set via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/inventory/new/page.tsx",
});

export default async function NewInventoryPage() {
  const mod = await getModule("inventory");
  const fields = await applyCustomizations("inventory.create", inventoryFormFields);

  return (
    <AppShell navGroups={await buildVendorNavGroups("inventory")} topbarTitle={`New Stock Item — ${mod?.label ?? "Inventory / Warehouse"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Stock Item</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new stock item record for Inventory / Warehouse.</p>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Stock Item" />
        </div>
      </div>
    </AppShell>
  );
}
