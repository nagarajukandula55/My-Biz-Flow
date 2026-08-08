import { DocumentView } from "@/components/DocumentView";
import { serviceCentreColumns, getServiceCentreRecord } from "@/lib/sample-data/service-centre";
import { registerPage } from "@/lib/designer/registry";

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
    "Renders a Service Centre workorder as a printable job card — handed to a customer as proof of intake/handover. Same template-or-default rendering as every other document page; see billing.document for the full mechanism.",
  sourceFile: "src/app/vendor/[vendorId]/service-centre/[recordId]/document/page.tsx",
});

export default function ServiceCentreDocumentPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const record = getServiceCentreRecord(params.recordId);
  return (
    <DocumentView
      pageId="service-centre.document"
      documentLabel="Job Card"
      vendorName="Chennai Auto Service"
      record={record}
      columns={serviceCentreColumns}
    />
  );
}
