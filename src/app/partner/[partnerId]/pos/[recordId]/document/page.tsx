import { DocumentView } from "@/components/DocumentView";
import { posColumns, extractSaleFromRecord } from "@/lib/sample-data/pos";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getPartner } from "@/lib/partnerData";
import { getBusinessRecord, getBusinessRecordSequenceIndex } from "@/lib/businessRecords";

registerPage({
  id: "pos.document",
  moduleSlug: "pos",
  title: "Receipt — Document",
  path: "/partner/[partnerId]/pos/[recordId]/document",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [{ key: "document-template", label: "Receipt HTML template (placeholders)" }],
  explanation:
    "Renders a POS sale as a printable customer receipt — real cart lines, tenders, and change due. Same template-or-default rendering as every other document page; see billing.document for the full mechanism. Thermal is offered alongside A4/A5, matching a real register's receipt printer. Real data — Prisma-backed (BusinessRecord table).",
  sourceFile: "src/app/partner/[partnerId]/pos/[recordId]/document/page.tsx",
});

export default async function PosDocumentPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "pos", params.recordId);
  if (!record) notFound();
  const partner = await getPartner(params.partnerId);
  const sequenceIndex = await getBusinessRecordSequenceIndex(params.partnerId, "pos", params.recordId);
  const sale = extractSaleFromRecord(record);
  const lineItems = sale.lines.map((l) => ({
    description: l.productName,
    quantity: l.qty,
    unit: "pc",
    unitPrice: l.qty > 0 ? (l.qty * l.unitPrice - l.discount) / l.qty : l.unitPrice,
    taxRate: l.taxRate,
  }));

  return (
    <DocumentView
      pageId="pos.document"
      documentType="pos.document"
      documentLabel="Receipt"
      partnerName={partner?.businessName ?? "Your Business"}
      partnerId={params.partnerId}
      record={record}
      columns={posColumns}
      sequenceIndex={sequenceIndex}
      lineItems={lineItems}
      printSizes={["thermal", "a4", "a5"]}
    />
  );
}
