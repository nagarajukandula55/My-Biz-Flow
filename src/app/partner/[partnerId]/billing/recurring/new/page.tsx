import { AppShell } from "@/components/AppShell";
import { renderTierGate } from "@/lib/pageTierGate";
import { registerPage } from "@/lib/designer/registry";
import { RecurringInvoiceForm } from "@/components/RecurringInvoiceForm";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { listBusinessRecords } from "@/lib/businessRecords";
import { getLineItemCatalogOptions } from "@/lib/lineItemCatalog";

registerPage({
  id: "billing.recurring.create",
  moduleSlug: "billing",
  title: "Billing — Recurring Invoices — Create",
  path: "/partner/[partnerId]/billing/recurring/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A dedicated Recurring Invoice template creation form with a repeating, live-computed line-items table (see LineItemsEditor). Real persistence — writes to the BusinessRecord table; the cron route reads these templates.",
  sourceFile: "src/app/partner/[partnerId]/billing/recurring/new/page.tsx",
});

export default async function NewRecurringInvoicePage({ params }: { params: { partnerId: string } }) {
  const tierGate = await renderTierGate(params.partnerId, "billing.recurring.create", "Recurring Invoices");
  if (tierGate) return <AppShell topbarTitle={"New Recurring Invoice"}>{tierGate}</AppShell>;

  const [contacts, itemOptions] = await Promise.all([
    listBusinessRecords(params.partnerId, "billing-contacts"),
    getLineItemCatalogOptions(params.partnerId),
  ]);
  const contactOptions = contacts.map((c) => ({ id: String(c["id"]), label: String(c["name"] ?? c["id"]), gstin: c["gstin"] ? String(c["gstin"]) : undefined }));

  return (
    <AppShell topbarTitle="New Recurring Invoice — Billing">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Recurring Invoice</h1>
        <p className="mt-1 text-sm text-text-muted">Create a template that generates an invoice on a schedule.</p>
        <div className="mt-6">
          <RecurringInvoiceForm
            submitLabel="Create Template"
            action={createBusinessRecordAction.bind(null, params.partnerId, "billing-recurring")}
            contactOptions={contactOptions}
            itemOptions={itemOptions}
          />
        </div>
      </div>
    </AppShell>
  );
}
