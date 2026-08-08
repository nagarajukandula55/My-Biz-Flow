import { DocumentView } from "@/components/DocumentView";
import { legalColumns, getLegalRecord } from "@/lib/sample-data/legal";
import { registerPage } from "@/lib/designer/registry";

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

export default function LegalDocumentPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const record = getLegalRecord(params.recordId);
  return (
    <DocumentView
      pageId="legal.document"
      documentLabel="Engagement Letter"
      vendorName="Chennai Auto Service"
      record={record}
      columns={legalColumns}
    />
  );
}
