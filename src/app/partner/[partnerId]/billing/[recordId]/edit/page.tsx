import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { BillingInvoiceForm } from "@/components/BillingInvoiceForm";
import type { LineItem } from "@/lib/sample-data/billing";
import { getBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";
import { getPartner } from "@/lib/partnerData";
import { getLineItemCatalogOptions } from "@/lib/lineItemCatalog";

registerPage({
  id: "billing.edit",
  moduleSlug: "billing",
  title: "Billing — Edit",
  path: "/partner/[partnerId]/billing/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same BillingInvoiceForm pre-populated with an existing invoice's real customer/date fields and line items, letting a user edit and save changes. Real persistence — writes to the BusinessRecord table.",
  sourceFile: "src/app/partner/[partnerId]/billing/[recordId]/edit/page.tsx",
});

export default async function EditBillingPage({ params }: { params: { partnerId: string; recordId: string } }) {
  const mod = await getModule("billing");
  const record = await getBusinessRecord(params.partnerId, "billing", params.recordId);
  if (!record) notFound();
  const items = (record["items"] as LineItem[] | undefined) ?? [];
  const invoiceType = items.some((it) => it.taxRate > 0) ? "GST" : "Non-GST";
  const [contacts, customers, partner, itemOptions] = await Promise.all([
    listBusinessRecords(params.partnerId, "billing-contacts"),
    listBusinessRecords(params.partnerId, "service-centre-customers"),
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
  const customerOptions = customers
    .filter((c) => c["status"] !== "Inactive")
    .map((c) => ({
      id: String(c["id"]),
      name: String(c["name"] ?? c["id"]),
      phone: c["phone"] ? String(c["phone"]) : undefined,
      email: c["email"] ? String(c["email"]) : undefined,
      address: c["address"] ? String(c["address"]) : undefined,
      city: c["city"] ? String(c["city"]) : undefined,
      state: c["state"] ? String(c["state"]) : undefined,
      pincode: c["pincode"] ? String(c["pincode"]) : undefined,
      gstin: c["gstin"] ? String(c["gstin"]) : undefined,
    }));

  return (
    <AppShell topbarTitle={`Edit Invoice — ${mod?.label ?? "Billing"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Invoice</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <BillingInvoiceForm
            initialValues={{
              customer: String(record["customer"] ?? ""),
              customerContactId: record["customerContactId"] ? String(record["customerContactId"]) : null,
              invoiceType,
              supplyType:
                record["supplyType"] === "INTERSTATE"
                  ? ("INTERSTATE" as const)
                  : record["supplyType"] === "INTRASTATE"
                  ? ("INTRASTATE" as const)
                  : undefined,
              customerGstin: String(record["customerGstin"] ?? ""),
              customerCompany: String(record["customerCompany"] ?? ""),
              customerPhone: String(record["customerPhone"] ?? ""),
              customerEmail: String(record["customerEmail"] ?? ""),
              customerAddress: String(record["customerAddress"] ?? ""),
              customerCity: String(record["customerCity"] ?? ""),
              customerState: String(record["customerState"] ?? ""),
              customerPincode: String(record["customerPincode"] ?? ""),
              issueDate: String(record["issueDate"] ?? ""),
              dueDate: String(record["dueDate"] ?? ""),
              discountAmount: Number(record["discountAmount"] ?? 0),
              notes: String(record["notes"] ?? ""),
              terms: String(record["terms"] ?? ""),
              paymentStatus: String(record["paymentStatus"] ?? "Draft"),
              paymentMode: String(record["paymentMode"] ?? "Bank Transfer"),
              items,
              showBankDetails: record["showBankDetails"] === undefined ? undefined : Boolean(record["showBankDetails"]),
              showUpiQr: record["showUpiQr"] === undefined ? undefined : Boolean(record["showUpiQr"]),
              showTerms: record["showTerms"] === undefined ? undefined : Boolean(record["showTerms"]),
              showNotes: record["showNotes"] === undefined ? undefined : Boolean(record["showNotes"]),
            }}
            submitLabel="Save changes"
            action={updateBusinessRecordAction.bind(null, params.partnerId, "billing", params.recordId)}
            contactOptions={contactOptions}
            customerOptions={customerOptions}
            itemOptions={itemOptions}
            partnerState={partner?.state}
            partnerId={params.partnerId}
            partnerBankDetails={{
              accountName: partner?.bankAccountName,
              bankName: partner?.bankName,
              accountNumber: partner?.bankAccountNumber,
              ifsc: partner?.bankIfsc,
            }}
            partnerUpiId={partner?.upiId}
          />
        </div>
      </div>
    </AppShell>
  );
}
