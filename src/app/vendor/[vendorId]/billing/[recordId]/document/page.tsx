import { DocumentView } from "@/components/DocumentView";
import { billingColumns, billingRows, billingLineItems, getBillingRecord } from "@/lib/sample-data/billing";
import { registerPage } from "@/lib/designer/registry";

registerPage({
  id: "billing.document",
  moduleSlug: "billing",
  title: "Invoice — Document",
  path: "/vendor/[vendorId]/billing/[recordId]/document",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [
    { key: "document-template", label: "Invoice HTML template (placeholders)" },
  ],
  explanation:
    "Renders a Billing record as a real printable invoice — letterhead + fields as a document, not a re-skinned table — with a browser print-to-PDF button. If a Super Admin has designed a custom template in the Designer (src/lib/designer/documentTemplates.ts), it renders that with {{fieldKey}} placeholders substituted; otherwise falls back to a default layout generated from billingColumns.",
  sourceFile: "src/app/vendor/[vendorId]/billing/[recordId]/document/page.tsx",
});

export default function BillingDocumentPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const record = getBillingRecord(params.recordId);
  const sequenceIndex = billingRows.findIndex((r) => String(r["id"]) === params.recordId);
  return (
    <DocumentView
      pageId="billing.document"
      documentType="billing.document"
      documentLabel="Invoice"
      vendorName="Chennai Auto Service"
      vendorId={params.vendorId}
      record={record}
      columns={billingColumns}
      sequenceIndex={sequenceIndex >= 0 ? sequenceIndex : 0}
      lineItems={billingLineItems[params.recordId]}
    />
  );
}
