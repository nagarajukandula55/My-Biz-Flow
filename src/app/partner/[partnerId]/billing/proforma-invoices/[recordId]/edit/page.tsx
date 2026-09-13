import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { SalesDocumentForm } from "@/components/SalesDocumentForm";
import type { LineItem } from "@/lib/sample-data/billing";
import { getBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "billing.proforma-invoices.edit",
  moduleSlug: "billing",
  title: "Billing — Proforma Invoices — Edit",
  path: "/partner/[partnerId]/billing/proforma-invoices/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same SalesDocumentForm pre-populated with an existing Proforma Invoice's real header fields and line items, letting a user edit and save changes. Real persistence — writes to the BusinessRecord table.",
  sourceFile: "src/app/partner/[partnerId]/billing/proforma-invoices/[recordId]/edit/page.tsx",
});

export default async function EditProformaInvoicePage({ params }: { params: { partnerId: string; recordId: string } }) {
  const record = await getBusinessRecord(params.partnerId, "billing-proforma-invoices", params.recordId);
  if (!record) notFound();
  const items = (record["items"] as LineItem[] | undefined) ?? [];
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
    <AppShell topbarTitle="Edit Proforma Invoice — Billing">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Proforma Invoice</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <SalesDocumentForm
            docKind="proforma-invoice"
            docLabel="Proforma Invoice"
            initialValues={{
              contact: String(record["contact"] ?? ""),
              issueDate: String(record["issueDate"] ?? ""),
              validUntil: String(record["validUntil"] ?? ""),
              purpose: String(record["purpose"] ?? ""),
              vehicleNumber: String(record["vehicleNumber"] ?? ""),
              dispatchAddress: String(record["dispatchAddress"] ?? ""),
              status: String(record["status"] ?? "Draft"),
              notes: String(record["notes"] ?? ""),
              items,
            }}
            submitLabel="Save changes"
            action={updateBusinessRecordAction.bind(null, params.partnerId, "billing-proforma-invoices", params.recordId)}
            contactOptions={contactOptions}
            itemOptions={itemOptions}
          />
        </div>
      </div>
    </AppShell>
  );
}
