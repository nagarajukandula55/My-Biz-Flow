import { DocumentView } from "@/components/DocumentView";
import { creditNoteColumns } from "@/lib/sample-data/billing-credit-notes";
import type { LineItem } from "@/lib/sample-data/billing";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getPartner } from "@/lib/partnerData";
import { getBusinessRecord, getBusinessRecordSequenceIndex } from "@/lib/businessRecords";

registerPage({
  id: "billing.credit-notes.document",
  moduleSlug: "billing",
  title: "Credit/Debit Note — Document",
  path: "/partner/[partnerId]/billing/credit-notes/[recordId]/document",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [
    { key: "document-template", label: "Note HTML template (placeholders)" },
  ],
  explanation:
    "Renders a Credit/Debit Note record as a printable document with a browser print-to-PDF button, same pattern as Billing's invoice document view. Real data — Prisma-backed (BusinessRecord table).",
  sourceFile: "src/app/partner/[partnerId]/billing/credit-notes/[recordId]/document/page.tsx",
});

export default async function CreditNoteDocumentPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "billing-credit-notes", params.recordId);
  if (!record) notFound();
  const partner = await getPartner(params.partnerId);
  const sequenceIndex = await getBusinessRecordSequenceIndex(params.partnerId, "billing-credit-notes", params.recordId);
  return (
    <DocumentView
      pageId="billing.credit-notes.document"
      documentType="billing.credit-notes.document"
      documentLabel={String(record["noteType"] ?? "Credit Note")}
      partnerName={partner?.businessName ?? "Your Business"}
      partnerId={params.partnerId}
      record={record}
      columns={creditNoteColumns}
      sequenceIndex={sequenceIndex}
      lineItems={record["items"] as LineItem[] | undefined}
    />
  );
}
