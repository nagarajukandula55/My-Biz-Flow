import { DocumentView } from "@/components/DocumentView";
import { amcFieldServiceColumns } from "@/lib/sample-data/amc-field-service";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getPartner } from "@/lib/partnerData";
import { getBusinessRecord, getBusinessRecordSequenceIndex } from "@/lib/businessRecords";

registerPage({
  id: "amc-field-service.document",
  moduleSlug: "amc-field-service",
  title: "Service Report — Document",
  path: "/partner/[partnerId]/amc-field-service/[recordId]/document",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [
    { key: "document-template", label: "Service Report HTML template (placeholders)" },
  ],
  explanation:
    "Renders an AMC/Field Service visit as a printable service report — includes the technician check-in geo/IP fields already captured on the record. Same template-or-default rendering as every other document page.",
  sourceFile: "src/app/partner/[partnerId]/amc-field-service/[recordId]/document/page.tsx",
});

export default async function AmcFieldServiceDocumentPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "amc-field-service", params.recordId);
  if (!record) notFound();
  const partner = await getPartner(params.partnerId);
  const sequenceIndex = await getBusinessRecordSequenceIndex(params.partnerId, "amc-field-service", params.recordId);
  return (
    <DocumentView
      pageId="amc-field-service.document"
      documentType="amc-field-service.document"
      documentLabel="Service Report"
      partnerName={partner?.businessName ?? "Your Business"}
      partnerId={params.partnerId}
      record={record}
      columns={amcFieldServiceColumns}
      sequenceIndex={sequenceIndex}
    />
  );
}
