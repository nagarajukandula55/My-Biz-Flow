import { DocumentView } from "@/components/DocumentView";
import { serviceCentreColumns } from "@/lib/sample-data/service-centre";
import { buildServiceCentreLines } from "@/lib/serviceCentreLines";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getPartner, resolveDocumentTerms } from "@/lib/partnerData";
import { getBusinessRecord, getBusinessRecordSequenceIndex } from "@/lib/businessRecords";

registerPage({
  id: "service-centre.service-record",
  moduleSlug: "service-centre",
  title: "Service Record — Document",
  path: "/partner/[partnerId]/service-centre/[recordId]/service-record",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [{ key: "document-template", label: "Service Record HTML template (placeholders)" }],
  explanation:
    "A distinct post-close priced document for a Service Centre workorder — what was diagnosed, what was actually repaired/replaced and who did it, plus the same priced lines as the Sales Invoice, framed as a record of the work rather than a tax document. Sits alongside the Job Card (pre-repair, unpriced), the Estimate (pre-approval quote) and the Sales Invoice (the GST-compliant billing document) as a fourth, separate printable — mirrors AN-CRM's print/jobsheets/[id]/service-record page. Lines come from the same buildServiceCentreLines() the Sales Invoice uses so the two documents' figures cannot drift apart.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/[recordId]/service-record/page.tsx",
});

/**
 * The record of what was done and who did it — intake/customer-billing
 * details (address, GST) are left off since this isn't the tax document;
 * the Sales Invoice already carries those.
 */
const SERVICE_RECORD_FIELDS = [
  "customer",
  "customerPhone",
  "deviceCategory",
  "brandName",
  "modelName",
  "device",
  "imeiOrSerialNumber",
  "faultDescription",
  "issueDescription",
  "remark",
  "engineerName",
  "collectedByName",
  "receivedDate",
  "status",
];

const SERVICE_RECORD_DECLARATION =
  "This document records the work carried out on this device and the amount charged for it. It is not a GST tax " +
  "invoice — see the Sales Invoice for the billing document. The device was tested and handed over in working " +
  "condition as described above; any fault arising after handover is subject to the warranty terms below, where set.";

export default async function ServiceCentreServiceRecordPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "service-centre", params.recordId);
  if (!record) notFound();
  const partner = await getPartner(params.partnerId);
  const sequenceIndex = await getBusinessRecordSequenceIndex(params.partnerId, "service-centre", params.recordId);
  const lines = await buildServiceCentreLines(params.partnerId, record);

  // Same derivation as the Sales Invoice/Estimate — a Service Record has no
  // stored subtotal/tax/total of its own, it prices the workorder's current
  // lines live.
  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.rate, 0);
  const tax = lines.reduce((sum, l) => sum + l.quantity * l.rate * (l.gstRate / 100), 0);

  return (
    <DocumentView
      pageId="service-centre.service-record"
      // Shares the workorder's numbering scheme, like the Job Card and
      // Estimate — a view of the same job, not a separately numbered
      // document.
      documentType="service-centre.document"
      documentLabel="Service Record"
      partnerName={partner?.businessName ?? "Your Business"}
      partnerId={params.partnerId}
      record={record}
      columns={serviceCentreColumns}
      sequenceIndex={sequenceIndex}
      fieldKeys={SERVICE_RECORD_FIELDS}
      lineItems={lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unit: "PCS",
        unitPrice: l.rate,
        taxRate: l.gstRate,
      }))}
      totals={{ subtotal, tax, total: subtotal + tax }}
      trackingCode={params.recordId}
      signatures={[
        "Customer Signature (device received back in working condition)",
        `For ${partner?.businessName ?? "Your Business"} — Authorised Signatory`,
      ]}
      termsText={resolveDocumentTerms(partner, "serviceRecord")}
      contactBand={{ hours: partner?.serviceHours, hotline: partner?.supportHotline }}
      footerNote={SERVICE_RECORD_DECLARATION}
      printSizes={["a4", "a5"]}
    />
  );
}
