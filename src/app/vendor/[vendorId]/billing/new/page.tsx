import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { billingFormFields } from "@/lib/sample-data/billing";

registerPage({
  id: "billing.create",
  moduleSlug: "billing",
  title: "Billing — Create",
  path: "/vendor/[vendorId]/billing/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new invoice in the billing module, built from the module's real field set via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/billing/new/page.tsx",
});

export default function NewBillingPage() {
  const mod = getModule("billing");

  return (
    <AppShell navGroups={buildVendorNavGroups("billing")} topbarTitle={`New Invoice — ${mod?.label ?? "Billing"}`}>
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">New Invoice</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new invoice record for Billing.</p>
        <div className="mt-6">
          <RecordForm fields={billingFormFields} submitLabel="Create Invoice" />
        </div>
      </div>
    </AppShell>
  );
}
