import type { LineItem } from "@/lib/sample-data/billing";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getPartner, resolveDocumentTerms } from "@/lib/partnerData";
import { getBusinessRecord, getBusinessRecordSequenceIndexFiltered } from "@/lib/businessRecords";
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
  // The real invoice number is assigned ONCE, atomically, at actual
  // creation time (createBusinessRecordAction in businessRecordActions.ts,
  // via the persisted NumberingCounter — getNextNumber) using the SAME
  // "invoice.b2c"/"invoice.b2b" scope a Service-Centre-workorder-
  // originated invoice uses (see service-centre/[recordId]/actions.ts) —
  // one shared per-partner sequence regardless of which module created
  // the invoice. Prefer that stored value; only recompute live (old
  // behavior, counting "billing" rows) as a fallback for invoices created
  // before this fix. Never call getNextNumber here — merely
  // viewing/reprinting this page must not consume/advance the counter.
  const isB2B = Boolean(String(record["customerGstin"] ?? "").trim());
  let invoiceNumber = record["invoiceNumber"] ? String(record["invoiceNumber"]) : undefined;
  if (!invoiceNumber) {
    const numberingDocType = isB2B ? "invoice.b2b" : "invoice.b2c";
    const numberingDefaults = isB2B ? { prefix: "INV" } : { prefix: "BILL" };
    const sequenceIndex = await getBusinessRecordSequenceIndexFiltered(
      params.partnerId,
      "billing",
      params.recordId,
      (data) => Boolean(String(data["customerGstin"] ?? "").trim()) === isB2B
    );
    const scheme = await getEffectiveScheme(numberingDocType, params.partnerId, numberingDefaults);
    invoiceNumber = formatNumber(scheme, scheme.sequenceStart + sequenceIndex);
  }
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
      showBankDetails={record["showBankDetails"] === undefined ? true : Boolean(record["showBankDetails"])}
      showUpiQr={record["showUpiQr"] === undefined ? true : Boolean(record["showUpiQr"])}
      showTerms={record["showTerms"] === undefined ? true : Boolean(record["showTerms"])}
      showNotes={record["showNotes"] === undefined ? true : Boolean(record["showNotes"])}
      logoDataUrl={partner?.logoDataUrl}
    />
  );
}
