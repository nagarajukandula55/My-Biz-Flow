import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { buildBillingPaymentFormFields } from "@/lib/sample-data/billing-payments";
import { applyCustomizations } from "@/lib/designer/customizations";
import { notFound } from "next/navigation";
import { getBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "billing.payments.edit",
  moduleSlug: "billing",
  title: "Billing — Payments — Edit",
  path: "/vendor/[vendorId]/billing/payments/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing payment's data, letting a user edit and save changes. Real persistence — writes to the BusinessRecord table.",
  sourceFile: "src/app/vendor/[vendorId]/billing/payments/[recordId]/edit/page.tsx",
});

export default async function EditBillingPaymentPage({ params }: { params: { vendorId: string; recordId: string } }) {
  const record = await getBusinessRecord(params.vendorId, "billing-payments", params.recordId);
  if (!record) notFound();
  const [invoices, contacts] = await Promise.all([
    listBusinessRecords(params.vendorId, "billing"),
    listBusinessRecords(params.vendorId, "billing-contacts"),
  ]);
  const invoiceOptions = invoices.map((inv) => String(inv["id"]));
  const contactOptions = contacts.map((c) => String(c["name"] ?? c["id"]));
  const fields = await applyCustomizations(
    "billing.payments.edit",
    buildBillingPaymentFormFields(invoiceOptions, contactOptions)
  );

  return (
    <AppShell topbarTitle="Edit Payment — Billing">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Edit Payment</h1>
        <p className="mt-1 text-xs text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={record}
            submitLabel="Save changes"
            action={updateBusinessRecordAction.bind(null, params.vendorId, "billing-payments", params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
