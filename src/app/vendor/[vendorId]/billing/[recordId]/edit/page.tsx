import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { billingFormFields, getBillingRecord } from "@/lib/sample-data/billing";
import { applyCustomizations } from "@/lib/designer/customizations";

registerPage({
  id: "billing.edit",
  moduleSlug: "billing",
  title: "Billing — Edit",
  path: "/vendor/[vendorId]/billing/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing invoice's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/billing/[recordId]/edit/page.tsx",
});

export default function EditBillingPage({ params }: { params: { recordId: string } }) {
  const mod = getModule("billing");
  const record = getBillingRecord(params.recordId);
  const fields = applyCustomizations("billing.edit", billingFormFields);

  return (
    <AppShell navGroups={buildVendorNavGroups("billing")} topbarTitle={`Edit Invoice — ${mod?.label ?? "Billing"}`}>
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">Edit Invoice</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm fields={fields} initialValues={record} submitLabel="Save changes" />
        </div>
      </div>
    </AppShell>
  );
}
