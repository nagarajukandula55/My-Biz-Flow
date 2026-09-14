import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { BillingInvoiceForm } from "@/components/BillingInvoiceForm";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { listBusinessRecords } from "@/lib/businessRecords";
import { getPartner } from "@/lib/partnerData";
import { getLineItemCatalogOptions } from "@/lib/lineItemCatalog";

registerPage({
  id: "billing.create",
  moduleSlug: "billing",
  title: "Billing — Create",
  path: "/partner/[partnerId]/billing/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A dedicated invoice creation form for Billing with a repeating, live-computed line-items table (see LineItemsEditor) feeding the subtotal/tax/total, instead of typing totals by hand. Real persistence — writes to the BusinessRecord table.",
  sourceFile: "src/app/partner/[partnerId]/billing/new/page.tsx",
});

export default async function NewBillingPage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("billing");
  const [contacts, partner, itemOptions] = await Promise.all([
    listBusinessRecords(params.partnerId, "billing-contacts"),
    getPartner(params.partnerId),
    getLineItemCatalogOptions(params.partnerId),
  ]);
  const contactOptions = contacts.map((c) => ({
    id: String(c["id"]),
    label: String(c["name"] ?? c["id"]),
    gstin: c["gstin"] ? String(c["gstin"]) : undefined,
    phone: c["phone"] ? String(c["phone"]) : undefined,
    email: c["email"] ? String(c["email"]) : undefined,
    address: c["billingAddress"] ? String(c["billingAddress"]) : undefined,
    city: c["city"] ? String(c["city"]) : undefined,
    state: c["state"] ? String(c["state"]) : undefined,
    pincode: c["pincode"] ? String(c["pincode"]) : undefined,
  }));

  return (
    <AppShell topbarTitle={`New Invoice — ${mod?.label ?? "Billing"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Invoice</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new invoice record for Billing.</p>
        <div className="mt-6">
          <BillingInvoiceForm
            submitLabel="Create Invoice"
            action={createBusinessRecordAction.bind(null, params.partnerId, "billing")}
            contactOptions={contactOptions}
            itemOptions={itemOptions}
            partnerState={partner?.state}
          />
        </div>
      </div>
    </AppShell>
  );
}
