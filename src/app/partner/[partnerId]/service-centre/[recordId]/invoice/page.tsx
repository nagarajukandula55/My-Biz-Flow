import { buildServiceCentreLines } from "@/lib/serviceCentreLines";
import { getEffectiveScheme } from "@/lib/designer/numbering";
import { formatNumber } from "@/lib/designer/numberingFormat";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getDocumentTemplate } from "@/lib/designer/documentTemplates";
import { getPartner, resolveDocumentTerms } from "@/lib/partnerData";
import { getBusinessRecord, getBusinessRecordSequenceIndexFiltered } from "@/lib/businessRecords";
import { formatDate } from "@/lib/format";
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

  // The real invoice number is assigned ONCE, atomically, at actual
  // invoice-creation time (createInvoiceFromWorkorderAction in actions.ts,
  // via the persisted NumberingCounter — getNextNumber) and stored on the
  // linked Billing record. Read it from there. The live
  // getBusinessRecordSequenceIndexFiltered recompute below is kept ONLY as
  // a fallback for invoices created before this fix (no stored
  // invoiceNumber yet) — it counts workorder rows, not invoices actually
  // issued, which is why numbers looked wrong/unstable (e.g. a partner's
  // first real invoice printing as "...-0013"). Never call getNextNumber
  // here: merely viewing/reprinting this page must not consume/advance
  // the counter.
  const linkedInvoice = record["invoiceId"]
    ? await getBusinessRecord(params.partnerId, "billing", String(record["invoiceId"]))
    : null;
  const isB2B = Boolean(String(record["customerGstin"] ?? "").trim());
  let invoiceNumber = linkedInvoice?.["invoiceNumber"] ? String(linkedInvoice["invoiceNumber"]) : undefined;
  if (!invoiceNumber) {
    // Shared scope with Billing's own invoices — see actions.ts.
    const numberingDocType = isB2B ? "invoice.b2b" : "invoice.b2c";
    const numberingDefaults = isB2B ? { prefix: "INV" } : { prefix: "BILL" };
    const sequenceIndex = await getBusinessRecordSequenceIndexFiltered(
      params.partnerId,
      "service-centre",
      params.recordId,
      (data) => Boolean(String(data["customerGstin"] ?? "").trim()) === isB2B
    );
    const scheme = await getEffectiveScheme(numberingDocType, params.partnerId, numberingDefaults);
    invoiceNumber = formatNumber(scheme, scheme.sequenceStart + sequenceIndex);
  }
  const lines = await buildServiceCentreLines(params.partnerId, record);
  const customTemplate = await getDocumentTemplate("service-centre.invoice");

  return (
    <ServiceCentreInvoiceDocument
      partnerName={partner?.businessName ?? "Your Business"}
      partnerGstin={partner?.gstin ?? ""}
      partnerPhone={partner?.businessContact ?? ""}
      partnerAddress={partner?.addressLine ?? ""}
      partnerCity={partner?.city ?? ""}
      // The issuing partner's own state IS the place of supply — comparing
      // it with the customer's is what decides CGST+SGST vs IGST.
      partnerState={partner?.state ?? ""}
      partnerPincode={partner?.pincode ?? ""}
      invoiceNumber={invoiceNumber}
      // Invoice date = handover date (when the customer actually received
      // the device/invoice), not receivedDate (intake) — same fix as
      // createInvoiceFromWorkorderAction in actions.ts, but this document
      // is a separate live-rendered print view, not read from the
      // persisted Billing record, so it needed its own fix.
      invoiceDate={formatDate(String(record["handedOverAt"] ?? record["receivedDate"] ?? new Date().toISOString()))}
      workorderNumber={String(record["id"] ?? "")}
      status={String(record["status"] ?? "")}
      // Only what was actually collected at handover — an uncollected job
      // prints an em dash rather than a guessed payment mode.
      paymentMode={String(record["paymentMode"] ?? "")}
      collectedByName={record["collectedByName"] ? String(record["collectedByName"]) : undefined}
      customerName={String(record["customer"] ?? "Walk-in Customer")}
      customerPhone={String(record["customerPhone"] ?? "")}
      customerGstin={String(record["customerGstin"] ?? "")}
      customerAddress={String(record["customerAddress"] ?? "")}
      // Falls back to the workorder's branch for jobs created before the
      // intake form collected a real customer city.
      customerCity={String(record["customerCity"] ?? record["branch"] ?? "")}
      customerState={String(record["customerState"] ?? "")}
      customerPincode={String(record["customerPincode"] ?? "")}
      brand={record["brandName"] ? String(record["brandName"]) : undefined}
      model={String(record["modelName"] ?? record["device"] ?? "") || undefined}
      imeiOrSerial={record["imeiOrSerialNumber"] ? String(record["imeiOrSerialNumber"]) : undefined}
      lines={lines}
      customTemplate={customTemplate}
      // The note the engineer recorded at handover — the closest thing a
      // workorder has to Billing's free-text invoice `notes`, and what a
      // customer reading this invoice would want alongside the charges.
      notes={String(record["handoverNotes"] ?? "")}
      termsText={resolveDocumentTerms(partner, "invoice")}
      upiId={partner?.upiId}
      logoDataUrl={partner?.logoDataUrl}
    />
  );
}
