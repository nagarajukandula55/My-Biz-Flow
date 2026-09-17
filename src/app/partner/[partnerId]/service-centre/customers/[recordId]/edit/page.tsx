import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { customersFormFields } from "@/lib/sample-data/service-centre-customers";
import { applyCustomizations } from "@/lib/designer/customizations";
import { notFound } from "next/navigation";
import { getBusinessRecord } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "service-centre.customers.edit",
  moduleSlug: "service-centre",
  title: "Customers — Edit",
  path: "/partner/[partnerId]/service-centre/customers/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing customer's data, letting a user edit and save changes.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/customers/[recordId]/edit/page.tsx",
});

export default async function EditScCustomerPage({ params }: { params: { partnerId: string; recordId: string } }) {
  const record = await getBusinessRecord(params.partnerId, "service-centre-customers", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizations("service-centre.customers.edit", customersFormFields);

  return (
    <AppShell topbarTitle="Edit Customer">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Edit Customer</h1>
        <p className="mt-1 text-xs text-text-muted">{String(record["name"])}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={record}
            submitLabel="Save changes"
            action={updateBusinessRecordAction.bind(null, params.partnerId, "service-centre-customers", params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
