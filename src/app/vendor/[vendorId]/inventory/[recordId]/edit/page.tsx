import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { inventoryFormFields, getInventoryRecord } from "@/lib/sample-data/inventory";

registerPage({
  id: "inventory.edit",
  moduleSlug: "inventory",
  title: "Inventory / Warehouse — Edit",
  path: "/vendor/[vendorId]/inventory/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing stock item's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/inventory/[recordId]/edit/page.tsx",
});

export default function EditInventoryPage({ params }: { params: { recordId: string } }) {
  const mod = getModule("inventory");
  const record = getInventoryRecord(params.recordId);

  return (
    <AppShell navGroups={buildVendorNavGroups("inventory")} topbarTitle={`Edit Stock Item — ${mod?.label ?? "Inventory / Warehouse"}`}>
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">Edit Stock Item</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm fields={inventoryFormFields} initialValues={record} submitLabel="Save changes" />
        </div>
      </div>
    </AppShell>
  );
}
