import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { SalesDocumentForm } from "@/components/SalesDocumentForm";
import type { LineItem } from "@/lib/sample-data/billing";
import { getBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";
import { getLineItemCatalogOptions } from "@/lib/lineItemCatalog";

registerPage({
  id: "billing.quotations.edit",
  moduleSlug: "billing",
  title: "Billing — Quotations — Edit",
  path: "/partner/[partnerId]/billing/quotations/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same SalesDocumentForm pre-populated with an existing Quotation's real header fields and line items, letting a user edit and save changes. Real persistence — writes to the BusinessRecord table.",
  sourceFile: "src/app/partner/[partnerId]/billing/quotations/[recordId]/edit/page.tsx",
});

export default async function EditQuotationPage({ params }: { params: { partnerId: string; recordId: string } }) {
  const record = await getBusinessRecord(params.partnerId, "billing-quotations", params.recordId);
  if (!record) notFound();
  const items = (record["items"] as LineItem[] | undefined) ?? [];
  const [contacts, itemOptions] = await Promise.all([
    listBusinessRecords(params.partnerId, "billing-contacts"),
    getLineItemCatalogOptions(params.partnerId),
  ]);
  const contactOptions = contacts.map((c) => ({ id: String(c["id"]), label: String(c["name"] ?? c["id"]), gstin: c["gstin"] ? String(c["gstin"]) : undefined }));

  return (
    <AppShell topbarTitle="Edit Quotation — Billing">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Quotation</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <SalesDocumentForm
            docKind="quotation"
            docLabel="Quotation"
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
            action={updateBusinessRecordAction.bind(null, params.partnerId, "billing-quotations", params.recordId)}
            contactOptions={contactOptions}
            itemOptions={itemOptions}
          />
        </div>
      </div>
    </AppShell>
  );
}
