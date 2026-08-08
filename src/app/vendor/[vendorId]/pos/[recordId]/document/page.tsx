import { DocumentView } from "@/components/DocumentView";
import { posColumns, posRows, getPosRecord } from "@/lib/sample-data/pos";
import { registerPage } from "@/lib/designer/registry";

registerPage({
  id: "pos.document",
  moduleSlug: "pos",
  title: "Receipt — Document",
  path: "/vendor/[vendorId]/pos/[recordId]/document",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [{ key: "document-template", label: "Receipt HTML template (placeholders)" }],
  explanation:
    "Renders a POS sale as a printable customer receipt. Same template-or-default rendering as every other document page; see billing.document for the full mechanism.",
  sourceFile: "src/app/vendor/[vendorId]/pos/[recordId]/document/page.tsx",
});

export default function PosDocumentPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const record = getPosRecord(params.recordId);
  const sequenceIndex = posRows.findIndex((r) => String(r["id"]) === params.recordId);
  return (
    <DocumentView
      pageId="pos.document"
      documentType="pos.document"
      documentLabel="Receipt"
      vendorName="Chennai Auto Service"
      vendorId={params.vendorId}
      record={record}
      columns={posColumns}
      sequenceIndex={sequenceIndex >= 0 ? sequenceIndex : 0}
    />
  );
}
