import { DocumentView } from "@/components/DocumentView";
import { billingColumns } from "@/lib/sample-data/billing";
import type { LineItem } from "@/lib/sample-data/billing";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getPartner } from "@/lib/partnerData";
import { getBusinessRecord, getBusinessRecordSequenceIndex } from "@/lib/businessRecords";

registerPage({
  id: "billing.document",
  moduleSlug: "billing",
  title: "Invoice — Document",
  path: "/partner/[partnerId]/billing/[recordId]/document",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [
    { key: "document-template", label: "Invoice HTML template (placeholders)" },
  ],
  explanation:
    "Renders a Billing record as a real printable invoice — letterhead + fields as a document, not a re-skinned table — with a browser print-to-PDF button. If a Super Admin has designed a custom template in the Designer (src/lib/designer/documentTemplates.ts), it renders that with {{fieldKey}} placeholders substituted; otherwise falls back to a default layout generated from billingColumns. Real data — Prisma-backed (BusinessRecord table).",
  sourceFile: "src/app/partner/[partnerId]/billing/[recordId]/document/page.tsx",
});

export default async function BillingDocumentPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "billing", params.recordId);
  if (!record) notFound();
  const partner = await getPartner(params.partnerId);
  const sequenceIndex = await getBusinessRecordSequenceIndex(params.partnerId, "billing", params.recordId);
  return (
    <DocumentView
      pageId="billing.document"
      documentType="billing.document"
      documentLabel="Invoice"
      partnerName={partner?.businessName ?? "Your Business"}
      partnerId={params.partnerId}
      record={record}
      columns={billingColumns}
      sequenceIndex={sequenceIndex}
      lineItems={record["items"] as LineItem[] | undefined}
    />
  );
}
