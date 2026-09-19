import { AppShell } from "@/components/AppShell";
import { renderTierGate } from "@/lib/pageTierGate";
import { registerPage } from "@/lib/designer/registry";
import { SalesDocumentForm } from "@/components/SalesDocumentForm";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { listBusinessRecords } from "@/lib/businessRecords";
import { getLineItemCatalogOptions } from "@/lib/lineItemCatalog";

registerPage({
  id: "billing.proforma-invoices.create",
  moduleSlug: "billing",
  title: "Billing — Proforma Invoices — Create",
  path: "/partner/[partnerId]/billing/proforma-invoices/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A Proforma Invoice creation form with a repeating, live-computed line-items table (see LineItemsEditor), mirroring Billing's invoice form. Real persistence — writes to the BusinessRecord table.",
  sourceFile: "src/app/partner/[partnerId]/billing/proforma-invoices/new/page.tsx",
});

export default async function NewProformaInvoicePage({ params }: { params: { partnerId: string } }) {
  const tierGate = await renderTierGate(params.partnerId, "billing.proforma-invoices.create", "Proforma Invoices");
  if (tierGate) return <AppShell topbarTitle={"New Proforma Invoice"}>{tierGate}</AppShell>;

  const [contacts, itemOptions] = await Promise.all([
    listBusinessRecords(params.partnerId, "billing-contacts"),
    getLineItemCatalogOptions(params.partnerId),
  ]);
  const contactOptions = contacts.map((c) => ({ id: String(c["id"]), label: String(c["name"] ?? c["id"]), gstin: c["gstin"] ? String(c["gstin"]) : undefined }));

  return (
    <AppShell topbarTitle="New Proforma Invoice — Billing">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Proforma Invoice</h1>
        <p className="mt-1 text-sm text-text-muted">Issue a proforma invoice to a Billing contact.</p>
        <div className="mt-6">
          <SalesDocumentForm
            docKind="proforma-invoice"
            docLabel="Proforma Invoice"
            submitLabel="Create Proforma Invoice"
            action={(values: Record<string, unknown>) => createBusinessRecordAction(params.partnerId, "billing-proforma-invoices", values, "billing/proforma-invoices")}
            contactOptions={contactOptions}
            itemOptions={itemOptions}
          />
        </div>
      </div>
    </AppShell>
  );
}
