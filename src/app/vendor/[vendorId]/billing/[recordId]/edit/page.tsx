import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { BillingInvoiceForm } from "@/components/BillingInvoiceForm";
import type { LineItem } from "@/lib/sample-data/billing";
import { getBusinessRecord } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "billing.edit",
  moduleSlug: "billing",
  title: "Billing — Edit",
  path: "/vendor/[vendorId]/billing/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same BillingInvoiceForm pre-populated with an existing invoice's real customer/date fields and line items, letting a user edit and save changes. Real persistence — writes to the BusinessRecord table.",
  sourceFile: "src/app/vendor/[vendorId]/billing/[recordId]/edit/page.tsx",
});

export default async function EditBillingPage({ params }: { params: { vendorId: string; recordId: string } }) {
  const mod = await getModule("billing");
  const record = await getBusinessRecord(params.vendorId, "billing", params.recordId);
  if (!record) notFound();
  const items = (record["items"] as LineItem[] | undefined) ?? [];
  const invoiceType = items.some((it) => it.taxRate > 0) ? "GST" : "Non-GST";

  return (
    <AppShell topbarTitle={`Edit Invoice — ${mod?.label ?? "Billing"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Invoice</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <BillingInvoiceForm
            initialValues={{
              customer: String(record["customer"] ?? ""),
              invoiceType,
              issueDate: String(record["issueDate"] ?? ""),
              dueDate: String(record["dueDate"] ?? ""),
              paymentStatus: String(record["paymentStatus"] ?? "Draft"),
              paymentMode: String(record["paymentMode"] ?? "Bank Transfer"),
              items,
            }}
            submitLabel="Save changes"
            action={updateBusinessRecordAction.bind(null, params.vendorId, "billing", params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
