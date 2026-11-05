import { ServiceCentreServiceRecordDocument } from "../service-record/ServiceCentreServiceRecordDocument";
import { isUnderWarranty } from "@/lib/sample-data/service-centre";
import { buildServiceCentreLines } from "@/lib/serviceCentreLines";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getPartner, resolveDocumentTerms } from "@/lib/partnerData";
import { getBusinessRecord } from "@/lib/businessRecords";
import { appendDocumentPrintedLogEntry } from "@/lib/documentPrintLog";

registerPage({
  id: "service-centre.estimate",
  moduleSlug: "service-centre",
  title: "Repair Estimate — Document",
  path: "/partner/[partnerId]/service-centre/[recordId]/estimate",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Uses the Service Record layout for a printable repair Estimate — the quote the customer approves before repair work begins, sitting between the (unpriced) Job Card and the (post-handover) Sales Invoice. Lines come from the same buildServiceCentreLines() the Sales Invoice uses, so the approved figure and the billed figure cannot drift apart; part lines still marked Pending are excluded from both. Non-chargeable warranty jobs price every line at zero. Real data — Prisma-backed (BusinessRecord table).",
  sourceFile: "src/app/partner/[partnerId]/service-centre/[recordId]/estimate/page.tsx",
});

function fmtDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
  });
}

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
  await appendDocumentPrintedLogEntry(params.partnerId, params.recordId, "Estimate");
  const partner = await getPartner(params.partnerId);
  const lines = await buildServiceCentreLines(params.partnerId, record);
  const text = (key: string) => typeof record[key] === "string" ? record[key] as string : undefined;
  const companyAddress = [partner?.addressLine, partner?.city, partner?.state, partner?.pincode]
    .filter((value) => typeof value === "string" && value.trim()).join(", ");
  const customerAddress = [text("customerAddress"), text("customerCity"), text("customerState"), text("customerPincode")]
    .filter((value) => value?.trim()).join(", ");

  return (
    <ServiceCentreServiceRecordDocument
      documentKind="estimate"
      docNumber={params.recordId}
      date={fmtDate(text("receivedDate") || text("recordCreatedAt"))}
      companyName={partner?.businessName ?? "Your Business"}
      companyAddress={companyAddress || undefined}
      companyPhone={partner?.businessContact}
      companyGstin={partner?.gstin}
      logoUrl={partner?.showLogoOnDocuments ? partner.logoDataUrl : null}
      termsText={resolveDocumentTerms(partner, "estimate")}
      customerName={text("customer") || "—"}
      customerPhone={text("customerPhone")}
      customerAddress={customerAddress || undefined}
      brand={text("brandName")}
      model={text("modelName") || text("device")}
      imeiOrSerial={text("imeiOrSerialNumber")}
      issueTitle={text("faultDescription") || text("issueDescription")}
      loggedBy={text("loggedBy")}
      technicalConsultant={text("engineerName")}
      detailRows={[
        { label: "Device Type", value: text("deviceCategory") },
        { label: "Warranty Type", value: text("warrantyStatus") || (isUnderWarranty(record) ? "Under Warranty" : "Out of Warranty") },
        { label: "Promised Delivery (SLA)", value: text("slaDate") ? fmtDate(text("slaDate")) : undefined },
      ]}
      lines={lines}
      serviceHours={partner?.serviceHours}
      supportHotline={partner?.supportHotline}
      footerNote={ESTIMATE_DECLARATION}
    />
  );
}
