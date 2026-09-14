import type { LineItem } from "@/lib/sample-data/billing";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getPartner, resolveDocumentTerms } from "@/lib/partnerData";
import { getBusinessRecord, getBusinessRecordSequenceIndex } from "@/lib/businessRecords";
import { getEffectiveScheme } from "@/lib/designer/numbering";
import { formatNumber } from "@/lib/designer/numberingFormat";
import { getDocumentTemplate } from "@/lib/designer/documentTemplates";
import { BillingInvoiceDocument } from "./BillingInvoiceDocument";

registerPage({
  id: "billing.document",
  moduleSlug: "billing",
  title: "Invoice — Document",
  path: "/partner/[partnerId]/billing/[recordId]/document",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [
    { key: "document-template", label: "Invoice HTML template (placeholders)" },
  ],
  explanation:
    "Renders a Billing record as a real GST tax invoice — letterhead + Bill To/Payment boxes + an itemized table with the per-line CGST/SGST vs IGST split and an HSN summary (BillingInvoiceDocument.tsx), same general shape as Service Centre's own Sales Invoice document. Tax is split by place of supply: a customer in this partner's own state is intra-state (CGST+SGST at half the slab each), a customer elsewhere is inter-state (IGST at the full slab). If a Super Admin has designed a custom template in the Designer (src/lib/designer/documentTemplates.ts), it renders that with {{fieldKey}} placeholders substituted instead. Real data — Prisma-backed (BusinessRecord table).",
  sourceFile: "src/app/partner/[partnerId]/billing/[recordId]/document/page.tsx",
});

export default async function BillingDocumentPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "billing", params.recordId);
  if (!record) notFound();
  const partner = await getPartner(params.partnerId);
  const sequenceIndex = await getBusinessRecordSequenceIndex(params.partnerId, "billing", params.recordId);
  const scheme = await getEffectiveScheme("billing.document", params.partnerId);
  const invoiceNumber = formatNumber(scheme, scheme.sequenceStart + sequenceIndex);
  const customTemplate = await getDocumentTemplate("billing.document");
  const items = (record["items"] as LineItem[] | undefined) ?? [];

  return (
    <BillingInvoiceDocument
      partnerId={params.partnerId}
      partnerName={partner?.businessName ?? "Your Business"}
      partnerGstin={partner?.gstin ?? ""}
      partnerPhone={partner?.businessContact ?? ""}
      partnerAddress={partner?.addressLine ?? ""}
      partnerCity={partner?.city ?? ""}
      partnerState={partner?.state ?? ""}
      partnerPincode={partner?.pincode ?? ""}
      invoiceNumber={invoiceNumber}
      invoiceDate={String(record["issueDate"] ?? new Date().toISOString())}
      dueDate={record["dueDate"] ? String(record["dueDate"]) : undefined}
      paymentMode={String(record["paymentMode"] ?? "")}
      bankDetails={{
        accountName: partner?.bankAccountName ?? undefined,
        bankName: partner?.bankName ?? undefined,
        accountNumber: partner?.bankAccountNumber ?? undefined,
        ifsc: partner?.bankIfsc ?? undefined,
      }}
      customerName={String(record["customer"] ?? "Customer")}
      customerCompany={record["customerCompany"] ? String(record["customerCompany"]) : undefined}
      customerPhone={record["customerPhone"] ? String(record["customerPhone"]) : undefined}
      customerEmail={record["customerEmail"] ? String(record["customerEmail"]) : undefined}
      customerGstin={record["customerGstin"] ? String(record["customerGstin"]) : undefined}
      customerAddress={record["customerAddress"] ? String(record["customerAddress"]) : undefined}
      customerCity={record["customerCity"] ? String(record["customerCity"]) : undefined}
      customerState={record["customerState"] ? String(record["customerState"]) : undefined}
      customerPincode={record["customerPincode"] ? String(record["customerPincode"]) : undefined}
      items={items}
      discountAmount={Number(record["discountAmount"] ?? 0)}
      customTemplate={customTemplate}
      notes={record["notes"] ? String(record["notes"]) : undefined}
      termsText={record["terms"] ? String(record["terms"]) : resolveDocumentTerms(partner, "invoice")}
      supportHotline={partner?.supportHotline}
      upiId={partner?.upiId}
    />
  );
}
