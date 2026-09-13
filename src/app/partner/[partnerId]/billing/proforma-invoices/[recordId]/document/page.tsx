import { DocumentView } from "@/components/DocumentView";
import { proformaInvoiceColumns } from "@/lib/sample-data/billing-sales-documents";
import type { LineItem } from "@/lib/sample-data/billing";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getPartner } from "@/lib/partnerData";
import { getBusinessRecord, getBusinessRecordSequenceIndex } from "@/lib/businessRecords";

registerPage({
  id: "billing.proforma-invoices.document",
  moduleSlug: "billing",
  title: "Proforma Invoice — Document",
  path: "/partner/[partnerId]/billing/proforma-invoices/[recordId]/document",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [
    { key: "document-template", label: "Proforma Invoice HTML template (placeholders)" },
  ],
  explanation:
    "Renders a Proforma Invoice record as a printable document with a browser print-to-PDF button, same pattern as Billing's invoice document view. Real data — Prisma-backed (BusinessRecord table).",
  sourceFile: "src/app/partner/[partnerId]/billing/proforma-invoices/[recordId]/document/page.tsx",
});

export default async function ProformaInvoiceDocumentPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "billing-proforma-invoices", params.recordId);
  if (!record) notFound();
  const partner = await getPartner(params.partnerId);
  const sequenceIndex = await getBusinessRecordSequenceIndex(params.partnerId, "billing-proforma-invoices", params.recordId);
  return (
    <DocumentView
      pageId="billing.proforma-invoices.document"
      documentType="billing.proforma-invoices.document"
      documentLabel="Proforma Invoice"
      partnerName={partner?.businessName ?? "Your Business"}
      partnerId={params.partnerId}
      record={record}
      columns={proformaInvoiceColumns}
      sequenceIndex={sequenceIndex}
      lineItems={record["items"] as LineItem[] | undefined}
    />
  );
}
