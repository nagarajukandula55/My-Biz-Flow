import { notFound } from "next/navigation";
import { registerPage } from "@/lib/designer/registry";
import { getPartner, resolveDocumentTerms } from "@/lib/partnerData";
import { getBusinessRecord, getBusinessRecordSequenceIndex } from "@/lib/businessRecords";
import { getEffectiveScheme } from "@/lib/designer/numbering";
import { formatNumber } from "@/lib/designer/numberingFormat";
import { ServiceCentreJobCardDocument } from "./ServiceCentreJobCardDocument";

registerPage({
  id: "service-centre.document",
  moduleSlug: "service-centre",
  title: "Workorder — Document",
  path: "/partner/[partnerId]/service-centre/[recordId]/document",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "The single, canonical printable workorder for a Service Centre job — a bespoke, hand-built layout (not the shared DocumentView/template system) that is an exact port of AN-CRM's own WORK_ORDER print (print/jobsheets/[id]/page.tsx: company-details / party-details / notes / terms / signature, no pricing), per explicit direction that this is now the single print action for a workorder — the separate 'Intake Receipt' document/button has been removed since the two were meant to be the same document. Keeps this app's own 'Track Your Repair' QR module, which AN-CRM's version never had. Real data — Prisma-backed (BusinessRecord table).",
  sourceFile: "src/app/partner/[partnerId]/service-centre/[recordId]/document/page.tsx",
});

function fmtDateEnIN(d?: string) {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function ServiceCentreDocumentPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "service-centre", params.recordId);
  if (!record) notFound();
  const partner = await getPartner(params.partnerId);
  const sequenceIndex = await getBusinessRecordSequenceIndex(params.partnerId, "service-centre", params.recordId);
  const scheme = await getEffectiveScheme("service-centre.document", params.partnerId);
  const documentNumber = formatNumber(scheme, scheme.sequenceStart + sequenceIndex);

  const r = record as Record<string, unknown>;
  const companyAddress = [partner?.addressLine, partner?.city, partner?.state, partner?.pincode]
    .filter((v) => typeof v === "string" && v.trim())
    .join(", ");
  const customerAddress = [r.customerAddress, r.customerCity, r.customerState, r.customerPincode]
    .filter((v) => typeof v === "string" && (v as string).trim())
    .join(", ");

  return (
    <ServiceCentreJobCardDocument
      partnerId={params.partnerId}
      trackingCode={params.recordId}
      docNumber={documentNumber}
      date={fmtDateEnIN((r.receivedDate as string) || (r.recordCreatedAt as string))}
      status={r.status as string | undefined}
      companyName={partner?.businessName ?? "Your Business"}
      companyAddress={companyAddress || undefined}
      companyPhone={partner?.businessContact}
      companyGstin={partner?.gstin}
      logoUrl={partner?.logoDataUrl}
      termsText={resolveDocumentTerms(partner, "workorder")}
      customerName={(r.customer as string) || "—"}
      customerPhone={r.customerPhone as string | undefined}
      customerAddress={customerAddress || undefined}
      brand={r.brandName as string | undefined}
      model={(r.modelName as string) || (r.device as string) || undefined}
      imeiOrSerial={r.imeiOrSerialNumber as string | undefined}
      issueTitle={r.faultDescription as string | undefined}
      issueDescription={r.issueDescription as string | undefined}
      workPerformed={r.workPerformed as string | undefined}
      loggedBy={r.loggedBy as string | undefined}
      engineerName={r.engineerName as string | undefined}
    />
  );
}
