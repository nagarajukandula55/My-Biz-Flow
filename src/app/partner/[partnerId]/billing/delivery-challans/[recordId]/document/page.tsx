import { DocumentView } from "@/components/DocumentView";
import { deliveryChallanColumns } from "@/lib/sample-data/billing-sales-documents";
import type { LineItem } from "@/lib/sample-data/billing";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getPartner, resolveDocumentTerms } from "@/lib/partnerData";
import { getBusinessRecord, getBusinessRecordSequenceIndex } from "@/lib/businessRecords";

registerPage({
  id: "billing.delivery-challans.document",
  moduleSlug: "billing",
  title: "Delivery Challan — Document",
  path: "/partner/[partnerId]/billing/delivery-challans/[recordId]/document",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [
    { key: "document-template", label: "Delivery Challan HTML template (placeholders)" },
  ],
  explanation:
    "Renders a Delivery Challan record as a printable document with a browser print-to-PDF button, same pattern as Billing's invoice document view. Real data — Prisma-backed (BusinessRecord table).",
  sourceFile: "src/app/partner/[partnerId]/billing/delivery-challans/[recordId]/document/page.tsx",
});

export default async function DeliveryChallanDocumentPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "billing-delivery-challans", params.recordId);
  if (!record) notFound();
  const partner = await getPartner(params.partnerId);
  const sequenceIndex = await getBusinessRecordSequenceIndex(params.partnerId, "billing-delivery-challans", params.recordId);
  return (
    <DocumentView
      pageId="billing.delivery-challans.document"
      documentType="billing.delivery-challans.document"
      documentLabel="Delivery Challan"
      partnerName={partner?.businessName ?? "Your Business"}
      partnerId={params.partnerId}
      record={record}
      columns={deliveryChallanColumns}
      sequenceIndex={sequenceIndex}
      lineItems={record["items"] as LineItem[] | undefined}
      termsText={resolveDocumentTerms(partner, "invoice")}
    />
  );
}
