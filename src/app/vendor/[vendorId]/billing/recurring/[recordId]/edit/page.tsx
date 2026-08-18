import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { RecurringInvoiceForm } from "@/components/RecurringInvoiceForm";
import type { LineItem } from "@/lib/sample-data/billing";
import type { RecurringFrequency } from "@/lib/sample-data/billing-recurring";
import { getBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "billing.recurring.edit",
  moduleSlug: "billing",
  title: "Billing — Recurring Invoices — Edit",
  path: "/vendor/[vendorId]/billing/recurring/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same RecurringInvoiceForm pre-populated with an existing template's data, letting a user edit and save changes. Real persistence — writes to the BusinessRecord table.",
  sourceFile: "src/app/vendor/[vendorId]/billing/recurring/[recordId]/edit/page.tsx",
});

export default async function EditRecurringInvoicePage({ params }: { params: { vendorId: string; recordId: string } }) {
  const record = await getBusinessRecord(params.vendorId, "billing-recurring", params.recordId);
  if (!record) notFound();
  const items = (record["items"] as LineItem[] | undefined) ?? [];
  const [contacts, catalogItems] = await Promise.all([
    listBusinessRecords(params.vendorId, "billing-contacts"),
    listBusinessRecords(params.vendorId, "billing-items"),
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
    <AppShell topbarTitle="Edit Recurring Invoice — Billing">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Recurring Invoice</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecurringInvoiceForm
            initialValues={{
              customer: String(record["customer"] ?? ""),
              frequency: (record["frequency"] as RecurringFrequency) ?? "Monthly",
              startDate: String(record["startDate"] ?? ""),
              nextRunDate: String(record["nextRunDate"] ?? ""),
              status: (record["status"] as "Active" | "Paused") ?? "Active",
              items,
            }}
            submitLabel="Save changes"
            action={updateBusinessRecordAction.bind(null, params.vendorId, "billing-recurring", params.recordId)}
            contactOptions={contactOptions}
            itemOptions={itemOptions}
          />
        </div>
      </div>
    </AppShell>
  );
}
