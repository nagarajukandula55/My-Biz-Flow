import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { buildVendorAdminNavGroups } from "@/lib/designer/vendorAdminNav";
import { registerPage } from "@/lib/designer/registry";
import { BillingInvoiceForm } from "@/components/BillingInvoiceForm";

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
  explanation: "A dedicated invoice creation form for Billing with a repeating, live-computed line-items table (see LineItemsEditor) feeding the subtotal/tax/total, instead of typing totals by hand. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/billing/new/page.tsx",
});

export default async function NewBillingPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("billing");

  return (
    <AppShell vendorId={params.vendorId} navGroups={await buildVendorAdminNavGroups(undefined, "billing")} topbarTitle={`New Invoice — ${mod?.label ?? "Billing"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Invoice</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new invoice record for Billing.</p>
        <div className="mt-6">
          <BillingInvoiceForm submitLabel="Create Invoice" />
        </div>
      </div>
    </AppShell>
  );
}
