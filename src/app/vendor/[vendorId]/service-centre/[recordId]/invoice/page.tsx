import { getWorkorderInvoiceLineItems } from "@/lib/sample-data/service-centre";
import { getEffectiveScheme } from "@/lib/designer/numbering";
import { formatNumber } from "@/lib/designer/numberingFormat";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getDocumentTemplate } from "@/lib/designer/documentTemplates";
import { getBusinessRecord, getBusinessRecordSequenceIndex } from "@/lib/businessRecords";
import { ServiceCentreInvoiceDocument } from "./ServiceCentreInvoiceDocument";

registerPage({
  id: "service-centre.invoice",
  moduleSlug: "service-centre",
  title: "Sales Invoice — Document",
  path: "/vendor/[vendorId]/service-centre/[recordId]/invoice",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [{ key: "document-template", label: "Sales Invoice layout" }],
  explanation:
    "Renders a closed Service Centre workorder's Parts & Service Lines as a billable GST Sales Invoice — A4/A5 print only (no thermal, unlike POS). General layout shape (letterhead + meta box, Bill To, itemized GST table, totals box, signatures, declaration) references AN-CRM's invoice per CLAUDE.md's documented UX-pattern exception; built from scratch against this repo's own design tokens.",
  sourceFile: "src/app/vendor/[vendorId]/service-centre/[recordId]/invoice/page.tsx",
});

export default async function ServiceCentreInvoicePage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.vendorId, "service-centre", params.recordId);
  if (!record) notFound();
  const sequenceIndex = await getBusinessRecordSequenceIndex(params.vendorId, "service-centre", params.recordId);
  const scheme = await getEffectiveScheme("service-centre.invoice", params.vendorId);
  const invoiceNumber = formatNumber(scheme, scheme.sequenceStart + sequenceIndex);
  const lines = getWorkorderInvoiceLineItems(params.recordId);
  const customTemplate = await getDocumentTemplate("service-centre.invoice");

  return (
    <ServiceCentreInvoiceDocument
      vendorName="Chennai Auto Service"
      invoiceNumber={invoiceNumber}
      invoiceDate={String(record["receivedDate"] ?? new Date().toISOString())}
      customerName={String(record["customer"] ?? "Walk-in Customer")}
      customerCity={String(record["branch"] ?? "")}
      lines={lines}
      customTemplate={customTemplate}
    />
  );
}
