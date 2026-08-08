import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { restaurantPosFormFields, getRestaurantPosRecord } from "@/lib/sample-data/restaurant-pos";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "restaurant-pos.edit",
  moduleSlug: "restaurant-pos",
  title: "Restaurant POS — Edit",
  path: "/vendor/[vendorId]/restaurant-pos/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing order's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/restaurant-pos/[recordId]/edit/page.tsx",
});

export default async function EditRestaurantPosPage({ params }: { params: { vendorId: string; recordId: string } }) {
  const mod = await getModule("restaurant-pos");
  const record = getRestaurantPosRecord(params.recordId);
  const fields = await applyCustomizations("restaurant-pos.edit", restaurantPosFormFields);

  return (
    <AppShell topbarTitle={`Edit Order — ${mod?.label ?? "Restaurant POS"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Order</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm fields={fields} initialValues={record} submitLabel="Save changes" />
        </div>
      </div>
    </AppShell>
  );
}
