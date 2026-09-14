import { extractLifecycleFromRecord } from "@/lib/sample-data/service-centre";
import { getEffectiveScheme } from "@/lib/designer/numbering";
import { formatNumber } from "@/lib/designer/numberingFormat";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getDocumentTemplate } from "@/lib/designer/documentTemplates";
import { getPartner } from "@/lib/partnerData";
import { getBusinessRecord, getBusinessRecordSequenceIndex, getBusinessRecordsByKeys } from "@/lib/businessRecords";
import { ServiceCentreInvoiceDocument, type InvoiceLine } from "./ServiceCentreInvoiceDocument";

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
  const sequenceIndex = await getBusinessRecordSequenceIndex(params.partnerId, "service-centre", params.recordId);
  const scheme = await getEffectiveScheme("service-centre.invoice", params.partnerId);
  const invoiceNumber = formatNumber(scheme, scheme.sequenceStart + sequenceIndex);
  const lines = await buildInvoiceLines(params.partnerId, record);
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
    />
  );
}

/**
 * Derives Sales Invoice line items from a workorder's Parts & Service
 * Lines, looking materials up in THIS partner's own live BOM (not the
 * global sample catalog). Warranty jobs are non-chargeable: every line's
 * rate is zeroed rather than silently charging a warranty repair (the
 * same rule createInvoiceFromWorkorderAction, ../actions.ts, applies when
 * persisting the real Billing invoice).
 */
async function buildInvoiceLines(partnerId: string, record: Awaited<ReturnType<typeof getBusinessRecord>>): Promise<InvoiceLine[]> {
  if (!record) return [];
  const underWarranty = Boolean(record["warrantyFlag"]);
  const lifecycle = extractLifecycleFromRecord(record);
  const items: InvoiceLine[] = [];
  for (const line of lifecycle.serviceLines) {
    items.push({ description: line.solutionLabel, hsn: "9987", quantity: 1, rate: underWarranty ? 0 : line.laborCharge, gstRate: 18 });
  }

  // Batch-fetch every referenced BOM material in one query instead of one
  // getBusinessRecord() round-trip per part line.
  const materialsById = await getBusinessRecordsByKeys(
    partnerId,
    "inventory-bom",
    lifecycle.partLines.map((line) => line.materialId)
  );
  for (const line of lifecycle.partLines) {
    const material = materialsById.get(line.materialId);
    items.push({
      description: line.materialLabel,
      hsn: String(material?.["hsnCode"] ?? ""),
      quantity: line.qty,
      // Prefer the price stamped onto the line when it was added — that's
      // the figure createInvoiceFromWorkorderAction bills and the customer
      // approved, so the printed document can't drift from the persisted
      // invoice if the catalog price changes afterwards. Falls back to the
      // live catalog for lines added before prices were stamped.
      rate: underWarranty ? 0 : Number(line.unitPrice ?? material?.["rate"] ?? 0),
      gstRate: Number(line.taxRate ?? material?.["taxPercent"] ?? 18),
    });
  }
  return items;
}
