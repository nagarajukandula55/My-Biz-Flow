import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { SalesDocumentForm } from "@/components/SalesDocumentForm";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "billing.quotations.create",
  moduleSlug: "billing",
  title: "Billing — Quotations — Create",
  path: "/partner/[partnerId]/billing/quotations/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A Quotation creation form with a repeating, live-computed line-items table (see LineItemsEditor), mirroring Billing's invoice form. Real persistence — writes to the BusinessRecord table.",
  sourceFile: "src/app/partner/[partnerId]/billing/quotations/new/page.tsx",
});

export default async function NewQuotationPage({ params }: { params: { partnerId: string } }) {
  const [contacts, catalogItems] = await Promise.all([
    listBusinessRecords(params.partnerId, "billing-contacts"),
    listBusinessRecords(params.partnerId, "billing-items"),
  ]);
  const contactOptions = contacts.map((c) => ({ id: String(c["id"]), label: String(c["name"] ?? c["id"]), gstin: c["gstin"] ? String(c["gstin"]) : undefined }));
  const itemOptions = catalogItems.map((it) => ({
    id: String(it["id"]),
    label: String(it["name"] ?? it["id"]),
    unit: String(it["unit"] ?? "pcs"),
    unitPrice: Number(it["rate"] ?? 0),
    taxRate: Number(it["taxRate"] ?? 0),
  }));

  return (
    <AppShell topbarTitle="New Quotation — Billing">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Quotation</h1>
        <p className="mt-1 text-sm text-text-muted">Issue a quotation to a Billing contact.</p>
        <div className="mt-6">
          <SalesDocumentForm
            docKind="quotation"
            docLabel="Quotation"
            submitLabel="Create Quotation"
            action={createBusinessRecordAction.bind(null, params.partnerId, "billing-quotations")}
            contactOptions={contactOptions}
            itemOptions={itemOptions}
          />
        </div>
      </div>
    </AppShell>
  );
}
