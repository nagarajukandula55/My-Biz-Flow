import { DocumentView } from "@/components/DocumentView";
import { serviceCentreColumns } from "@/lib/sample-data/service-centre";
import { buildServiceCentreLines } from "@/lib/serviceCentreLines";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getPartner, resolveDocumentTerms } from "@/lib/partnerData";
import { getBusinessRecord, getBusinessRecordSequenceIndex } from "@/lib/businessRecords";

registerPage({
  id: "service-centre.estimate",
  moduleSlug: "service-centre",
  title: "Repair Estimate — Document",
  path: "/partner/[partnerId]/service-centre/[recordId]/estimate",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [{ key: "document-template", label: "Estimate HTML template (placeholders)" }],
  explanation:
    "Prices a workorder's current Parts & Service Lines as a printable repair Estimate — the quote the customer approves before repair work begins, sitting between the (unpriced) Job Card and the (post-handover) Sales Invoice. Lines come from the same buildServiceCentreLines() the Sales Invoice uses, so the approved figure and the billed figure cannot drift apart; part lines still marked Pending are excluded from both. Non-chargeable warranty jobs price every line at zero. Real data — Prisma-backed (BusinessRecord table).",
  sourceFile: "src/app/partner/[partnerId]/service-centre/[recordId]/estimate/page.tsx",
});

/**
 * An estimate identifies the device and what's wrong with it, then prices
 * the fix — it is not a handover receipt, so the intake-condition fields
 * (appearance, file backup, accessories) that belong on the Job Card are
 * left off here, as are customer address/GST details, which only matter on
 * the actual tax document.
 */
const ESTIMATE_FIELDS = [
  "customer",
  "customerPhone",
  "deviceCategory",
  "brandName",
  "modelName",
  "device",
  "imeiOrSerialNumber",
  "warrantyStatus",
  "warrantyFlag",
  "faultDescription",
  "issueDescription",
  "receivedDate",
  "slaDate",
  "engineerName",
];

const ESTIMATE_DECLARATION =
  "This is an estimate, not a tax invoice. Prices are subject to change based on what the repair actually requires — " +
  "any additional part or labour found necessary during the repair will be quoted again before it is carried out. " +
  "Parts still awaiting stock are not priced here. Signing below authorises the repair at the amount shown.";

export default async function ServiceCentreEstimatePage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "service-centre", params.recordId);
  if (!record) notFound();
  const partner = await getPartner(params.partnerId);
  const sequenceIndex = await getBusinessRecordSequenceIndex(params.partnerId, "service-centre", params.recordId);
  const lines = await buildServiceCentreLines(params.partnerId, record);

  // Totals are derived live from the workorder's current lines, not read off
  // the record — an estimate has no stored subtotal/tax/total of its own.
  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.rate, 0);
  const tax = lines.reduce((sum, l) => sum + l.quantity * l.rate * (l.gstRate / 100), 0);

  return (
    <DocumentView
      pageId="service-centre.estimate"
      // Shares the Job Card's numbering scheme deliberately: an estimate is
      // a view of the same workorder, not a separately numbered document, so
      // it prints the same reference the customer already holds.
      documentType="service-centre.document"
      documentLabel="Repair Estimate"
      partnerName={partner?.businessName ?? "Your Business"}
      partnerId={params.partnerId}
      record={record}
      columns={serviceCentreColumns}
      sequenceIndex={sequenceIndex}
      fieldKeys={ESTIMATE_FIELDS}
      lineItems={lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unit: "PCS",
        unitPrice: l.rate,
        taxRate: l.gstRate,
      }))}
      totals={{ subtotal, tax, total: subtotal + tax }}
      signatures={[
        "Customer Signature (approval to proceed)",
        `For ${partner?.businessName ?? "Your Business"} — Authorised Signatory`,
      ]}
      termsText={resolveDocumentTerms(partner, "estimate")}
      contactBand={{ hours: partner?.serviceHours, hotline: partner?.supportHotline }}
      footerNote={ESTIMATE_DECLARATION}
      logoDataUrl={partner?.logoDataUrl}
      printSizes={["a4", "a5"]}
    />
  );
}
