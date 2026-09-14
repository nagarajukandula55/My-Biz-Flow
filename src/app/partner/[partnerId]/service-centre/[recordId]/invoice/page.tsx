import { buildServiceCentreLines } from "@/lib/serviceCentreLines";
import { getEffectiveScheme } from "@/lib/designer/numbering";
import { formatNumber } from "@/lib/designer/numberingFormat";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getDocumentTemplate } from "@/lib/designer/documentTemplates";
import { getPartner, resolveDocumentTerms } from "@/lib/partnerData";
import { getBusinessRecord, getBusinessRecordSequenceIndexFiltered } from "@/lib/businessRecords";
import { ServiceCentreInvoiceDocument } from "./ServiceCentreInvoiceDocument";

registerPage({
  id: "service-centre.invoice",
  moduleSlug: "service-centre",
  title: "Sales Invoice — Document",
  path: "/partner/[partnerId]/service-centre/[recordId]/invoice",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [{ key: "document-template", label: "Sales Invoice layout" }],
  explanation:
    "Renders a closed Service Centre workorder's Parts & Service Lines as a billable GST Sales Invoice — A4/A5 print only (no thermal, unlike POS). General layout shape (letterhead + meta box with the originating workorder number, Bill To and Payment boxes, itemized GST table, HSN summary, totals box, bank details, signatures, declaration) references AN-CRM's invoice per CLAUDE.md's documented UX-pattern exception; built from scratch against this repo's own design tokens. Tax is split by place of supply: a customer in the partner's own state is intra-state and taxed CGST + SGST at half the slab each, a customer elsewhere is inter-state and taxed IGST at the full slab. A B2C document carrying no tax at all (e.g. a fully non-chargeable warranty job) prints as a plain BILL rather than a TAX INVOICE. Line items derive from this partner's own live BOM materials, not the global sample catalog.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/[recordId]/invoice/page.tsx",
});

export default async function ServiceCentreInvoicePage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "service-centre", params.recordId);
  if (!record) notFound();
  const partner = await getPartner(params.partnerId);
  // Same B2B/B2C split as Billing's own invoice document (see
  // billing/[recordId]/document/page.tsx): a real customer GSTIN makes it
  // B2B (prefix INV), otherwise B2C (prefix BILL) — each with its own
  // independent, gap-free sequence rather than one shared counter.
  const isB2B = Boolean(String(record["customerGstin"] ?? "").trim());
  const numberingDocType = isB2B ? "service-centre.invoice.b2b" : "service-centre.invoice.b2c";
  const numberingDefaults = isB2B ? { prefix: "INV" } : { prefix: "BILL" };
  const sequenceIndex = await getBusinessRecordSequenceIndexFiltered(
    params.partnerId,
    "service-centre",
    params.recordId,
    (data) => Boolean(String(data["customerGstin"] ?? "").trim()) === isB2B
  );
  const scheme = await getEffectiveScheme(numberingDocType, params.partnerId, numberingDefaults);
  const invoiceNumber = formatNumber(scheme, scheme.sequenceStart + sequenceIndex);
  const lines = await buildServiceCentreLines(params.partnerId, record);
  const customTemplate = await getDocumentTemplate("service-centre.invoice");

  return (
    <ServiceCentreInvoiceDocument
      partnerId={params.partnerId}
      partnerName={partner?.businessName ?? "Your Business"}
      partnerGstin={partner?.gstin ?? ""}
      partnerPhone={partner?.businessContact ?? ""}
      partnerAddress={partner?.addressLine ?? ""}
      partnerCity={partner?.city ?? ""}
      // The issuing partner's own state IS the place of supply — comparing
      // it with the customer's is what decides CGST+SGST vs IGST.
      partnerState={partner?.state ?? ""}
      partnerPincode={partner?.pincode ?? ""}
      bankDetails={{
        accountName: partner?.bankAccountName ?? undefined,
        bankName: partner?.bankName ?? undefined,
        accountNumber: partner?.bankAccountNumber ?? undefined,
        ifsc: partner?.bankIfsc ?? undefined,
      }}
      invoiceNumber={invoiceNumber}
      invoiceDate={String(record["receivedDate"] ?? new Date().toISOString())}
      workorderNumber={String(record["id"] ?? "")}
      // Only what was actually collected at handover — an uncollected job
      // prints an em dash rather than a guessed payment mode.
      paymentMode={String(record["paymentMode"] ?? "")}
      paymentReference={String(record["paymentReference"] ?? "")}
      customerName={String(record["customer"] ?? "Walk-in Customer")}
      customerPhone={String(record["customerPhone"] ?? "")}
      customerCompany={String(record["customerCompany"] ?? "")}
      customerGstin={String(record["customerGstin"] ?? "")}
      customerAddress={String(record["customerAddress"] ?? "")}
      // Falls back to the workorder's branch for jobs created before the
      // intake form collected a real customer city.
      customerCity={String(record["customerCity"] ?? record["branch"] ?? "")}
      customerState={String(record["customerState"] ?? "")}
      customerPincode={String(record["customerPincode"] ?? "")}
      lines={lines}
      customTemplate={customTemplate}
      termsText={resolveDocumentTerms(partner, "invoice")}
      serviceHours={partner?.serviceHours}
      supportHotline={partner?.supportHotline}
      upiId={partner?.upiId}
      logoDataUrl={partner?.logoDataUrl}
    />
  );
}
