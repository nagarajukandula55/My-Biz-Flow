import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { wholesaleB2bFormFields, getWholesaleB2bRecord } from "@/lib/sample-data/wholesale-b2b";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "wholesale-b2b.edit",
  moduleSlug: "wholesale-b2b",
  title: "Wholesale / Distributor B2B — Edit",
  path: "/vendor/[vendorId]/wholesale-b2b/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing order's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/wholesale-b2b/[recordId]/edit/page.tsx",
});

export default function EditWholesaleB2bPage({ params }: { params: { recordId: string } }) {
  const mod = getModule("wholesale-b2b");
  const record = getWholesaleB2bRecord(params.recordId);
  const fields = applyCustomizations("wholesale-b2b.edit", wholesaleB2bFormFields);

  return (
    <AppShell navGroups={buildVendorNavGroups("wholesale-b2b")} topbarTitle={`Edit Order — ${mod?.label ?? "Wholesale / Distributor B2B"}`}>
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">Edit Order</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm fields={fields} initialValues={record} submitLabel="Save changes" />
        </div>
      </div>
    </AppShell>
  );
}
