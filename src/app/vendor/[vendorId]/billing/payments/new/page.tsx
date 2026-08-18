import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { buildBillingPaymentFormFields } from "@/lib/sample-data/billing-payments";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "billing.payments.create",
  moduleSlug: "billing",
  title: "Billing — Payments — Create",
  path: "/vendor/[vendorId]/billing/payments/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for recording a new payment against a Billing invoice, built via the shared RecordForm component with invoice/contact select options fetched live. Real persistence — writes to the BusinessRecord table.",
  sourceFile: "src/app/vendor/[vendorId]/billing/payments/new/page.tsx",
});

export default async function NewBillingPaymentPage({ params }: { params: { vendorId: string } }) {
  const [invoices, contacts] = await Promise.all([
    listBusinessRecords(params.vendorId, "billing"),
    listBusinessRecords(params.vendorId, "billing-contacts"),
  ]);
  const invoiceOptions = invoices.map((inv) => String(inv["id"]));
  const contactOptions = contacts.map((c) => String(c["name"] ?? c["id"]));
  const fields = await applyCustomizations(
    "billing.payments.create",
    buildBillingPaymentFormFields(invoiceOptions, contactOptions)
  );

  return (
    <AppShell topbarTitle="New Payment — Billing">
      <div>
        <h1 className="font-display text-xl font-bold text-text">New Payment</h1>
        <p className="mt-1 text-xs text-text-muted">Record a payment against a Billing invoice.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Record Payment"
            action={createBusinessRecordAction.bind(null, params.vendorId, "billing-payments")}
          />
        </div>
      </div>
    </AppShell>
  );
}
