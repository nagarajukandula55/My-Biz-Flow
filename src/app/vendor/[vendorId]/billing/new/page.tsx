import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { BillingInvoiceForm } from "@/components/BillingInvoiceForm";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { listBusinessRecords } from "@/lib/businessRecords";

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
  explanation: "A dedicated invoice creation form for Billing with a repeating, live-computed line-items table (see LineItemsEditor) feeding the subtotal/tax/total, instead of typing totals by hand. Real persistence — writes to the BusinessRecord table.",
  sourceFile: "src/app/vendor/[vendorId]/billing/new/page.tsx",
});

export default async function NewBillingPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("billing");
  const [contacts, items] = await Promise.all([
    listBusinessRecords(params.vendorId, "billing-contacts"),
    listBusinessRecords(params.vendorId, "billing-items"),
  ]);
  const contactOptions = contacts.map((c) => ({ id: String(c["id"]), label: String(c["name"] ?? c["id"]), gstin: c["gstin"] ? String(c["gstin"]) : undefined }));
  const itemOptions = items.map((it) => ({
    id: String(it["id"]),
    label: String(it["name"] ?? it["id"]),
    unit: String(it["unit"] ?? "pcs"),
    unitPrice: Number(it["rate"] ?? 0),
    taxRate: Number(it["taxRate"] ?? 0),
  }));

  return (
    <AppShell topbarTitle={`New Invoice — ${mod?.label ?? "Billing"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Invoice</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new invoice record for Billing.</p>
        <div className="mt-6">
          <BillingInvoiceForm
            submitLabel="Create Invoice"
            action={createBusinessRecordAction.bind(null, params.vendorId, "billing")}
            contactOptions={contactOptions}
            itemOptions={itemOptions}
          />
        </div>
      </div>
    </AppShell>
  );
}
