import { DocumentView } from "@/components/DocumentView";
import { legalColumns } from "@/lib/sample-data/legal";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getVendor } from "@/lib/vendorData";
import { getBusinessRecord, getBusinessRecordSequenceIndex } from "@/lib/businessRecords";

registerPage({
  id: "legal.document",
  moduleSlug: "legal",
  title: "Engagement Letter — Document",
  path: "/vendor/[vendorId]/legal/[recordId]/document",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [
    { key: "document-template", label: "Engagement Letter HTML template (placeholders)" },
  ],
  explanation:
    "Renders a Legal matter as a printable engagement letter. Same template-or-default rendering as every other document page; see billing.document for the full mechanism.",
  sourceFile: "src/app/vendor/[vendorId]/legal/[recordId]/document/page.tsx",
});

export default async function LegalDocumentPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.vendorId, "legal", params.recordId);
  if (!record) notFound();
  const vendor = await getVendor(params.vendorId);
  const sequenceIndex = await getBusinessRecordSequenceIndex(params.vendorId, "legal", params.recordId);
  return (
    <DocumentView
      pageId="legal.document"
      documentType="legal.document"
      documentLabel="Engagement Letter"
      vendorName={vendor?.businessName ?? "Your Business"}
      vendorId={params.vendorId}
      record={record}
      columns={legalColumns}
      sequenceIndex={sequenceIndex}
    />
  );
}
