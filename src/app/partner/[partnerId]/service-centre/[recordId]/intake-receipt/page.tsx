import { DocumentView } from "@/components/DocumentView";
import { serviceCentreColumns } from "@/lib/sample-data/service-centre";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getPartner, resolveDocumentTerms } from "@/lib/partnerData";
import { getBusinessRecord, getBusinessRecordSequenceIndex } from "@/lib/businessRecords";

registerPage({
  id: "service-centre.intake-receipt",
  moduleSlug: "service-centre",
  title: "Intake Receipt — Document",
  path: "/partner/[partnerId]/service-centre/[recordId]/intake-receipt",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [
    { key: "document-template", label: "Intake Receipt HTML template (placeholders)" },
  ],
  explanation:
    "The 'Service Handover Report' a customer signs when they hand a device IN — the detailed condition-of-intake record: warranty type/flag/expiry, IMEI/serial, device appearance, whether files were backed up, accessories received and the promised (SLA) delivery date, plus the front-desk consultant who took it in and a signature line. Mirrors AN-CRM's separate print/jobsheets/[id]/intake-receipt page, which is deliberately distinct from its thin work_order print: the Job Card (../document) is the slip that travels with the device through the shop, this is the signed proof of what was received and in what state. Real data — Prisma-backed (BusinessRecord table); shares the workorder's own numbering, since it documents the same job rather than being a separately numbered document.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/[recordId]/intake-receipt/page.tsx",
});

/**
 * Everything that describes the device AS RECEIVED, in the order a
 * front-desk consultant fills it in: who is handing it over, what the unit
 * is, what warranty cover it carries, the condition it arrived in, what
 * came with it, what's wrong with it, and when it was promised back.
 *
 * These fields live here and NOT on the Job Card (../document) on purpose.
 * AN-CRM keeps the same split — a thin work_order print (customer/device/
 * notes, no intake-condition detail, driven by jobSheetToRenderData) plus
 * this separate, detailed "Service Handover Report". Folding both into one
 * document is what this pair exists to avoid: the Job Card is re-printed
 * and handled throughout the repair, while this is the signed record of
 * the device's state at the moment responsibility for it transferred.
 *
 * No pricing of any kind: nothing is known about cost at intake, and a
 * figure on a handover receipt reads as a quote the shop is bound by. The
 * Estimate (../estimate) is the priced pre-approval document.
 */
const INTAKE_RECEIPT_FIELDS = [
  // Who handed it over
  "customer",
  "customerPhone",
  "customerEmail",
  "customerCompany",
  "customerAddress",
  "customerCity",
  "customerState",
  "customerPincode",
  // What came in
  "deviceCategory",
  "brandName",
  "modelName",
  "device",
  "imeiOrSerialNumber",
  // Warranty cover at intake
  "warrantyStatus",
  "warrantyFlag",
  "warrantyExpiryDate",
  // Condition as received
  "deviceAppearance",
  "fileBackupDescription",
  "standardAccessories",
  // Why it's here
  "faultDescription",
  "issueDescription",
  "remark",
  // Handling commitments
  "receivedDate",
  "slaDate",
  "branch",
  "loggedBy",
];

const INTAKE_RECEIPT_DECLARATION =
  "This is a device handover receipt, not a tax invoice. The unit described above was received in the condition " +
  "recorded, together with the accessories listed and no others. Data on the device is the customer's own " +
  "responsibility — where a file backup is recorded as not taken, the service centre accepts no liability for data " +
  "loss during repair. Any repair charge is quoted separately as an Estimate and requires the customer's approval " +
  "before work begins; the promised delivery date shown is an estimate and may move if parts are unavailable. " +
  "Signing below confirms the device, its accessories and its recorded condition as described.";

export default async function ServiceCentreIntakeReceiptPage({
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
      pageId="service-centre.intake-receipt"
      // Shares the workorder's numbering scheme, like the Job Card,
      // Estimate and Service Record — this documents the same job, it is
      // not a separately numbered document, so the reference printed here
      // is the one the customer already holds.
      documentType="service-centre.document"
      documentLabel="Service Handover Report"
      partnerName={partner?.businessName ?? "Your Business"}
      partnerId={params.partnerId}
      record={record}
      columns={serviceCentreColumns}
      sequenceIndex={sequenceIndex}
      fieldKeys={INTAKE_RECEIPT_FIELDS}
      signatures={[
        "Customer Signature (device and accessories handed over as described)",
        `For ${partner?.businessName ?? "Your Business"} — Service Consultant`,
      ]}
      // An intake receipt is a workorder-stage document, so it carries the
      // partner's workorder terms rather than a set of its own.
      termsText={resolveDocumentTerms(partner, "workorder")}
      contactBand={{ hours: partner?.serviceHours, hotline: partner?.supportHotline }}
      footerNote={INTAKE_RECEIPT_DECLARATION}
      logoDataUrl={partner?.logoDataUrl}
      printSizes={["a4", "a5"]}
    />
  );
}
