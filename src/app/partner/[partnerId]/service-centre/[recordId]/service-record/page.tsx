import { notFound } from "next/navigation";
import { registerPage } from "@/lib/designer/registry";
import { getPartner, resolveDocumentTerms } from "@/lib/partnerData";
import { getBusinessRecord } from "@/lib/businessRecords";
import { buildServiceCentreLines } from "@/lib/serviceCentreLines";
import { ServiceCentreServiceRecordDocument } from "./ServiceCentreServiceRecordDocument";

registerPage({
  id: "service-centre.service-record",
  moduleSlug: "service-centre",
  title: "Service Record — Document",
  path: "/partner/[partnerId]/service-centre/[recordId]/service-record",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "A distinct post-close priced document for a Service Centre workorder — what was diagnosed/repaired and the priced lines, framed as a record of work rather than a tax document. A bespoke, hand-built layout (not the shared DocumentView/template system) — an exact port of AN-CRM's own SERVICE RECORD print (header / company-details / party-details / items-table / totals / terms / signature), per explicit direction that AN-CRM's layout is now canonical for this document. No QR, per explicit direction. Lines come from buildServiceCentreLines(), same as the Sales Invoice, so the two documents' figures cannot drift apart.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/[recordId]/service-record/page.tsx",
});

function fmtDateEnIN(d?: string) {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

export default async function ServiceCentreServiceRecordPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "service-centre", params.recordId);
  if (!record) notFound();
  const partner = await getPartner(params.partnerId);
  const lines = await buildServiceCentreLines(params.partnerId, record);

  const r = record as Record<string, unknown>;
  // Same workorder id as the Job Card print, not a second peeked sequence —
  // see document/page.tsx's identical comment.
  const documentNumber = params.recordId;
  // The Service Record documents completed work, so its date is when the
  // repair was actually finished — the workorder's own "Completed" stage
  // transition (stageHistory, appended by patchServiceCentreWorkorderAction),
  // not intake/creation. Falls back to handover/receipt for any workorder
  // that predates stageHistory or never passed through Completed.
  const stageHistory = (r.stageHistory as { at: string; stage: string }[] | undefined) ?? [];
  const completedAt = [...stageHistory].reverse().find((h) => h.stage === "Completed")?.at;
  const serviceRecordDate =
    completedAt || (r.handedOverAt as string | undefined) || (r.receivedDate as string) || (r.recordCreatedAt as string);
  const companyAddress = [partner?.addressLine, partner?.city, partner?.state, partner?.pincode]
    .filter((v) => typeof v === "string" && v.trim())
    .join(", ");
  const customerAddress = [r.customerAddress, r.customerCity, r.customerState, r.customerPincode]
    .filter((v) => typeof v === "string" && (v as string).trim())
    .join(", ");

  return (
    <ServiceCentreServiceRecordDocument
      docNumber={documentNumber}
      date={fmtDateEnIN(serviceRecordDate)}
      companyName={partner?.businessName ?? "Your Business"}
      companyAddress={companyAddress || undefined}
      companyPhone={partner?.businessContact}
      companyGstin={partner?.gstin}
      logoUrl={partner?.showLogoOnDocuments ? partner?.logoDataUrl : null}
      termsText={resolveDocumentTerms(partner, "serviceRecord")}
      customerName={(r.customer as string) || "—"}
      customerPhone={r.customerPhone as string | undefined}
      customerAddress={customerAddress || undefined}
      brand={r.brandName as string | undefined}
      model={(r.modelName as string) || (r.device as string) || undefined}
      imeiOrSerial={r.imeiOrSerialNumber as string | undefined}
      issueTitle={r.faultDescription as string | undefined}
      loggedBy={r.loggedBy as string | undefined}
      technicalConsultant={r.engineerName as string | undefined}
      lines={lines}
      serviceHours={partner?.serviceHours}
      supportHotline={partner?.supportHotline}
    />
  );
}
