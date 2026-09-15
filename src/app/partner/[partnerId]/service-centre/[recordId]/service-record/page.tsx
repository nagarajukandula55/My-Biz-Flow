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
  //
  // AN-CRM's own serviceRecordToRenderData() reads a PERSISTED invoice's
  // items/totals when one exists, falling back to live recompute only
  // pre-invoice — specifically to avoid the Service Record and the actual
  // invoice drifting apart. Re-verified this pass that My-Biz-Flow's
  // always-live-recompute approach here is safe by construction and does
  // NOT need that same persisted-invoice read, because (see commit
  // 4163281, "Close+invoice atomically, add HSN suggestions, per-line GST
  // split, and B2B/B2C invoice numbering"):
  //   1. partLines/serviceLines become read-only the moment the workorder
  //      leaves "In Progress" (WorkorderLifecycle.tsx: `editable = stage
  //      === "In Progress" && !hold && !cancelled`) — there is no UI path
  //      to edit a line once the job is Completed or Closed.
  //   2. createInvoiceFromWorkorderAction only ever fires once the
  //      workorder is already "Closed" (actions.ts), i.e. strictly after
  //      lines have frozen — so the invoice, once it exists, is always a
  //      snapshot of the same frozen lines this page recomputes from.
  //   3. A Closed workorder can no longer be cancelled/reopened
  //      (cancelWorkorderAction throws "A closed workorder can no longer
  //      be cancelled"), so there is no cancel-then-reopen path back to an
  //      editable state post-invoice.
  //   4. The generic Edit form (../edit/page.tsx) only submits
  //      serviceCentreFormFields, which deliberately excludes
  //      partLines/serviceLines — so it can't touch lines either,
  //      regardless of stage.
  // Net: once an invoice exists for this workorder, its lines cannot
  // change, so live-recompute and read-the-persisted-invoice necessarily
  // agree. If a future change reopens any of the above (e.g. an admin
  // "Designer"-style raw record editor that can write partLines/
  // serviceLines directly), switch this to read invoice.items/totals
  // when `invoiceId` is set on the record, matching AN-CRM's real
  // approach — buildServiceCentreLines() would then only run pre-invoice.
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
        unit: l.unit,
        unitPrice: l.rate,
        taxRate: l.gstRate,
      }))}
      totals={{ subtotal, tax, total: subtotal + tax }}
      signatures={[
        "Customer Signature (device received back in working condition)",
        `For ${partner?.businessName ?? "Your Business"} — Authorised Signatory`,
      ]}
      termsText={resolveDocumentTerms(partner, "serviceRecord")}
      contactBand={{ hours: partner?.serviceHours, hotline: partner?.supportHotline }}
      footerNote={SERVICE_RECORD_DECLARATION}
      logoDataUrl={partner?.logoDataUrl}
      printSizes={["a4", "a5"]}
    />
  );
}
