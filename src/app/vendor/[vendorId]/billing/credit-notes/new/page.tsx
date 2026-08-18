import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { CreditNoteForm } from "@/components/CreditNoteForm";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "billing.credit-notes.create",
  moduleSlug: "billing",
  title: "Billing — Credit/Debit Notes — Create",
  path: "/vendor/[vendorId]/billing/credit-notes/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A dedicated Credit Note / Debit Note creation form with a repeating, live-computed line-items table (see LineItemsEditor), mirroring Billing's invoice form. Real persistence — writes to the BusinessRecord table.",
  sourceFile: "src/app/vendor/[vendorId]/billing/credit-notes/new/page.tsx",
});

export default async function NewCreditNotePage({ params }: { params: { vendorId: string } }) {
  const [contacts, items, invoices] = await Promise.all([
    listBusinessRecords(params.vendorId, "billing-contacts"),
    listBusinessRecords(params.vendorId, "billing-items"),
    listBusinessRecords(params.vendorId, "billing"),
  ]);
  const contactOptions = contacts.map((c) => ({ id: String(c["id"]), label: String(c["name"] ?? c["id"]), gstin: c["gstin"] ? String(c["gstin"]) : undefined }));
  const itemOptions = items.map((it) => ({
    id: String(it["id"]),
    label: String(it["name"] ?? it["id"]),
    unit: String(it["unit"] ?? "pcs"),
    unitPrice: Number(it["rate"] ?? 0),
    taxRate: Number(it["taxRate"] ?? 0),
  }));
  const invoiceOptions = invoices.map((inv) => String(inv["id"]));

  return (
    <AppShell topbarTitle="New Credit/Debit Note — Billing">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Credit / Debit Note</h1>
        <p className="mt-1 text-sm text-text-muted">Issue a note adjusting a contact's balance.</p>
        <div className="mt-6">
          <CreditNoteForm
            submitLabel="Create Note"
            action={createBusinessRecordAction.bind(null, params.vendorId, "billing-credit-notes")}
            contactOptions={contactOptions}
            itemOptions={itemOptions}
            invoiceOptions={invoiceOptions}
          />
        </div>
      </div>
    </AppShell>
  );
}
