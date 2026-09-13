import { DocumentView } from "@/components/DocumentView";
import { quotationColumns } from "@/lib/sample-data/billing-sales-documents";
import type { LineItem } from "@/lib/sample-data/billing";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getPartner } from "@/lib/partnerData";
import { getBusinessRecord, getBusinessRecordSequenceIndex } from "@/lib/businessRecords";

registerPage({
  id: "billing.quotations.document",
  moduleSlug: "billing",
  title: "Quotation — Document",
  path: "/partner/[partnerId]/billing/quotations/[recordId]/document",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [
    { key: "document-template", label: "Quotation HTML template (placeholders)" },
  ],
  explanation:
    "Renders a Quotation record as a printable document with a browser print-to-PDF button, same pattern as Billing's invoice document view. Real data — Prisma-backed (BusinessRecord table).",
  sourceFile: "src/app/partner/[partnerId]/billing/quotations/[recordId]/document/page.tsx",
});

export default async function QuotationDocumentPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "billing-quotations", params.recordId);
  if (!record) notFound();
  const partner = await getPartner(params.partnerId);
  const sequenceIndex = await getBusinessRecordSequenceIndex(params.partnerId, "billing-quotations", params.recordId);
  return (
    <DocumentView
      pageId="billing.quotations.document"
      documentType="billing.quotations.document"
      documentLabel="Quotation"
      partnerName={partner?.businessName ?? "Your Business"}
      partnerId={params.partnerId}
      record={record}
      columns={quotationColumns}
      sequenceIndex={sequenceIndex}
      lineItems={record["items"] as LineItem[] | undefined}
    />
  );
}
