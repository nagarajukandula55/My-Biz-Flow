import { DocumentView } from "@/components/DocumentView";
import { serviceCentreColumns } from "@/lib/sample-data/service-centre";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getBusinessRecord, getBusinessRecordSequenceIndex } from "@/lib/businessRecords";

registerPage({
  id: "service-centre.document",
  moduleSlug: "service-centre",
  title: "Job Card — Document",
  path: "/vendor/[vendorId]/service-centre/[recordId]/document",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [
    { key: "document-template", label: "Job Card HTML template (placeholders)" },
  ],
  explanation:
    "Renders a Service Centre workorder as a printable job card — handed to a customer as proof of intake/handover. Same template-or-default rendering as every other document page; see billing.document for the full mechanism. Real data — Prisma-backed (BusinessRecord table).",
  sourceFile: "src/app/vendor/[vendorId]/service-centre/[recordId]/document/page.tsx",
});

export default async function ServiceCentreDocumentPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.vendorId, "service-centre", params.recordId);
  if (!record) notFound();
  const sequenceIndex = await getBusinessRecordSequenceIndex(params.vendorId, "service-centre", params.recordId);
  return (
    <DocumentView
      pageId="service-centre.document"
      documentType="service-centre.document"
      documentLabel="Job Card"
      vendorName="Chennai Auto Service"
      vendorId={params.vendorId}
      record={record}
      columns={serviceCentreColumns}
      sequenceIndex={sequenceIndex}
    />
  );
}
