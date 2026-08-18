import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { billingContactFormFields } from "@/lib/sample-data/billing-contacts";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "billing.contacts.create",
  moduleSlug: "billing",
  title: "Billing — Contacts — Create",
  path: "/vendor/[vendorId]/billing/contacts/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new Billing Contact (customer or vendor), built via the shared RecordForm component. Real persistence — writes to the BusinessRecord table.",
  sourceFile: "src/app/vendor/[vendorId]/billing/contacts/new/page.tsx",
});

export default async function NewBillingContactPage({ params }: { params: { vendorId: string } }) {
  const fields = await applyCustomizations("billing.contacts.create", billingContactFormFields);

  return (
    <AppShell topbarTitle="New Contact — Billing">
      <div>
        <h1 className="font-display text-xl font-bold text-text">New Contact</h1>
        <p className="mt-1 text-xs text-text-muted">Create a new customer or vendor contact.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Contact"
            action={createBusinessRecordAction.bind(null, params.vendorId, "billing-contacts")}
          />
        </div>
      </div>
    </AppShell>
  );
}
