import { DocumentView } from "@/components/DocumentView";
import { amcFieldServiceColumns, getAmcFieldServiceRecord } from "@/lib/sample-data/amc-field-service";
import { registerPage } from "@/lib/designer/registry";

registerPage({
  id: "amc-field-service.document",
  moduleSlug: "amc-field-service",
  title: "Service Report — Document",
  path: "/vendor/[vendorId]/amc-field-service/[recordId]/document",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [
    { key: "document-template", label: "Service Report HTML template (placeholders)" },
  ],
  explanation:
    "Renders an AMC/Field Service visit as a printable service report — includes the technician check-in geo/IP fields already captured on the record. Same template-or-default rendering as every other document page.",
  sourceFile: "src/app/vendor/[vendorId]/amc-field-service/[recordId]/document/page.tsx",
});

export default function AmcFieldServiceDocumentPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const record = getAmcFieldServiceRecord(params.recordId);
  return (
    <DocumentView
      pageId="amc-field-service.document"
      documentLabel="Service Report"
      vendorName="Chennai Auto Service"
      record={record}
      columns={amcFieldServiceColumns}
    />
  );
}
