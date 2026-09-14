import { DocumentView } from "@/components/DocumentView";
import { serviceCentreColumns } from "@/lib/sample-data/service-centre";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getPartner, resolveDocumentTerms } from "@/lib/partnerData";
import { getBusinessRecord, getBusinessRecordSequenceIndex } from "@/lib/businessRecords";

registerPage({
  id: "service-centre.document",
  moduleSlug: "service-centre",
  title: "Job Card — Document",
  path: "/partner/[partnerId]/service-centre/[recordId]/document",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [
    { key: "document-template", label: "Job Card HTML template (placeholders)" },
  ],
  explanation:
    "Renders a Service Centre workorder as a printable job card — handed to a customer as proof of intake. Same template-or-default rendering as every other document page; see billing.document for the full mechanism. Real data — Prisma-backed (BusinessRecord table). Deliberately carries NO pricing: a job card is the paper a customer holds while the device is in the shop, before what the repair costs is even known. The priced document is the Estimate (../estimate) and, after handover, the Sales Invoice (../invoice).",
  sourceFile: "src/app/partner/[partnerId]/service-centre/[recordId]/document/page.tsx",
});

/**
 * What actually prints on the job card, in reading order: who the customer
 * is, what came in, what's wrong with it, and who took it in.
 *
 * Everything else on the workorder is deliberately left off. Cost fields
 * (estimatedAmount/estimatedCost/actualCost) are not knowable at intake and
 * a figure on a job card reads as a quote the shop is bound by; pickup
 * latitude/longitude, branch, priority, appointment/request type and the
 * lifecycle status are internal dispatch metadata; internal notes are
 * staff-only by definition. All of them remain on the detail view and the
 * edit form — this is a print-selection, nothing is dropped from the record.
 */
const JOB_CARD_FIELDS = [
  // Customer
  "customer",
  "customerPhone",
  "customerEmail",
  "customerCompany",
  "customerGstin",
  "customerAddress",
  "customerCity",
  "customerState",
  "customerPincode",
  // Device as received
  "deviceCategory",
  "brandName",
  "modelName",
  "device",
  "imeiOrSerialNumber",
  "warrantyStatus",
  "warrantyFlag",
  "warrantyExpiryDate",
  "deviceAppearance",
  "fileBackupDescription",
  "standardAccessories",
  // Why it's here
  "faultDescription",
  "issueDescription",
  "remark",
  // Handling
  "receivedDate",
  "slaDate",
  "loggedBy",
  "engineerName",
];

const JOB_CARD_DECLARATION =
  "This is a service job card and not a tax invoice. The device has been received in the condition recorded above. " +
  "Any repair charge is quoted separately as an Estimate and requires the customer's approval before work begins. " +
  "The signature below confirms the device, its accessories and its recorded condition as described.";

export default async function ServiceCentreDocumentPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "service-centre", params.recordId);
  if (!record) notFound();
  const partner = await getPartner(params.partnerId);
  const sequenceIndex = await getBusinessRecordSequenceIndex(params.partnerId, "service-centre", params.recordId);
  return (
    <DocumentView
      pageId="service-centre.document"
      documentType="service-centre.document"
      documentLabel="Job Card"
      partnerName={partner?.businessName ?? "Your Business"}
      partnerId={params.partnerId}
      record={record}
      columns={serviceCentreColumns}
      sequenceIndex={sequenceIndex}
      fieldKeys={JOB_CARD_FIELDS}
      trackingCode={params.recordId}
      signatures={[
        "Customer Signature",
        `For ${partner?.businessName ?? "Your Business"} — Authorised Signatory`,
      ]}
      termsText={resolveDocumentTerms(partner, "workorder")}
      contactBand={{ hours: partner?.serviceHours, hotline: partner?.supportHotline }}
      footerNote={JOB_CARD_DECLARATION}
      logoDataUrl={partner?.logoDataUrl}
    />
  );
}
