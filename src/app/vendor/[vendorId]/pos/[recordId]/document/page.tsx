import { DocumentView } from "@/components/DocumentView";
import { posColumns } from "@/lib/sample-data/pos";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getBusinessRecord, getBusinessRecordSequenceIndex } from "@/lib/businessRecords";

registerPage({
  id: "pos.document",
  moduleSlug: "pos",
  title: "Receipt — Document",
  path: "/vendor/[vendorId]/pos/[recordId]/document",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [{ key: "document-template", label: "Receipt HTML template (placeholders)" }],
  explanation:
    "Renders a POS sale as a printable customer receipt. Same template-or-default rendering as every other document page; see billing.document for the full mechanism. Real data — Prisma-backed (BusinessRecord table).",
  sourceFile: "src/app/vendor/[vendorId]/pos/[recordId]/document/page.tsx",
});

export default async function PosDocumentPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.vendorId, "pos", params.recordId);
  if (!record) notFound();
  const sequenceIndex = await getBusinessRecordSequenceIndex(params.vendorId, "pos", params.recordId);
  return (
    <DocumentView
      pageId="pos.document"
      documentType="pos.document"
      documentLabel="Receipt"
      vendorName="Chennai Auto Service"
      vendorId={params.vendorId}
      record={record}
      columns={posColumns}
      sequenceIndex={sequenceIndex}
    />
  );
}
