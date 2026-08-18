import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { CreditNoteForm } from "@/components/CreditNoteForm";
import type { LineItem } from "@/lib/sample-data/billing";
import { getBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "billing.credit-notes.edit",
  moduleSlug: "billing",
  title: "Billing — Credit/Debit Notes — Edit",
  path: "/vendor/[vendorId]/billing/credit-notes/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same CreditNoteForm pre-populated with an existing note's real contact/date fields and line items, letting a user edit and save changes. Real persistence — writes to the BusinessRecord table.",
  sourceFile: "src/app/vendor/[vendorId]/billing/credit-notes/[recordId]/edit/page.tsx",
});

export default async function EditCreditNotePage({ params }: { params: { vendorId: string; recordId: string } }) {
  const record = await getBusinessRecord(params.vendorId, "billing-credit-notes", params.recordId);
  if (!record) notFound();
  const items = (record["items"] as LineItem[] | undefined) ?? [];
  const [contacts, catalogItems, invoices] = await Promise.all([
    listBusinessRecords(params.vendorId, "billing-contacts"),
    listBusinessRecords(params.vendorId, "billing-items"),
    listBusinessRecords(params.vendorId, "billing"),
  ]);
  const contactOptions = contacts.map((c) => ({ id: String(c["id"]), label: String(c["name"] ?? c["id"]), gstin: c["gstin"] ? String(c["gstin"]) : undefined }));
  const itemOptions = catalogItems.map((it) => ({
    id: String(it["id"]),
    label: String(it["name"] ?? it["id"]),
    unit: String(it["unit"] ?? "pcs"),
    unitPrice: Number(it["rate"] ?? 0),
    taxRate: Number(it["taxRate"] ?? 0),
  }));
  const invoiceOptions = invoices.map((inv) => String(inv["id"]));

  return (
    <AppShell topbarTitle="Edit Credit/Debit Note — Billing">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Credit / Debit Note</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <CreditNoteForm
            initialValues={{
              noteType: (record["noteType"] as "Credit Note" | "Debit Note") ?? "Credit Note",
              contact: String(record["contact"] ?? ""),
              linkedInvoiceId: String(record["linkedInvoiceId"] ?? ""),
              reason: String(record["reason"] ?? ""),
              issueDate: String(record["issueDate"] ?? ""),
              items,
            }}
            submitLabel="Save changes"
            action={updateBusinessRecordAction.bind(null, params.vendorId, "billing-credit-notes", params.recordId)}
            contactOptions={contactOptions}
            itemOptions={itemOptions}
            invoiceOptions={invoiceOptions}
          />
        </div>
      </div>
    </AppShell>
  );
}
