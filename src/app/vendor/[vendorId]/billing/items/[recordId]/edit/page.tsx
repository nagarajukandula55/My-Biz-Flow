import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { billingItemFormFields } from "@/lib/sample-data/billing-items";
import { applyCustomizations } from "@/lib/designer/customizations";
import { notFound } from "next/navigation";
import { getBusinessRecord } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "billing.items.edit",
  moduleSlug: "billing",
  title: "Billing — Items — Edit",
  path: "/vendor/[vendorId]/billing/items/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing Item's data, letting a user edit and save changes. Real persistence — writes to the BusinessRecord table.",
  sourceFile: "src/app/vendor/[vendorId]/billing/items/[recordId]/edit/page.tsx",
});

export default async function EditBillingItemPage({ params }: { params: { vendorId: string; recordId: string } }) {
  const record = await getBusinessRecord(params.vendorId, "billing-items", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizations("billing.items.edit", billingItemFormFields);

  return (
    <AppShell topbarTitle="Edit Item — Billing">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Edit Item</h1>
        <p className="mt-1 text-xs text-text-muted">{String(record["name"] ?? record["id"])}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={record}
            submitLabel="Save changes"
            action={updateBusinessRecordAction.bind(null, params.vendorId, "billing-items", params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
