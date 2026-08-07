import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { restaurantPosFormFields } from "@/lib/sample-data/restaurant-pos";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "restaurant-pos.create",
  moduleSlug: "restaurant-pos",
  title: "Restaurant POS — Create",
  path: "/vendor/[vendorId]/restaurant-pos/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new order in the restaurant-pos module, built from the module's real field set via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/restaurant-pos/new/page.tsx",
});

export default function NewRestaurantPosPage() {
  const mod = getModule("restaurant-pos");
  const fields = applyCustomizations("restaurant-pos.create", restaurantPosFormFields);

  return (
    <AppShell navGroups={buildVendorNavGroups("restaurant-pos")} topbarTitle={`New Order — ${mod?.label ?? "Restaurant POS"}`}>
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">New Order</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new order record for Restaurant POS.</p>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Order" />
        </div>
      </div>
    </AppShell>
  );
}
