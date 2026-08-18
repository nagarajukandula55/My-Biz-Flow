import { DocumentView } from "@/components/DocumentView";
import { creditNoteColumns } from "@/lib/sample-data/billing-credit-notes";
import type { LineItem } from "@/lib/sample-data/billing";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getVendor } from "@/lib/vendorData";
import { getBusinessRecord, getBusinessRecordSequenceIndex } from "@/lib/businessRecords";

registerPage({
  id: "billing.credit-notes.document",
  moduleSlug: "billing",
  title: "Credit/Debit Note — Document",
  path: "/vendor/[vendorId]/billing/credit-notes/[recordId]/document",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [
    { key: "document-template", label: "Note HTML template (placeholders)" },
  ],
  explanation:
    "Renders a Credit/Debit Note record as a printable document with a browser print-to-PDF button, same pattern as Billing's invoice document view. Real data — Prisma-backed (BusinessRecord table).",
  sourceFile: "src/app/vendor/[vendorId]/billing/credit-notes/[recordId]/document/page.tsx",
});

export default async function CreditNoteDocumentPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.vendorId, "billing-credit-notes", params.recordId);
  if (!record) notFound();
  const vendor = await getVendor(params.vendorId);
  const sequenceIndex = await getBusinessRecordSequenceIndex(params.vendorId, "billing-credit-notes", params.recordId);
  return (
    <DocumentView
      pageId="billing.credit-notes.document"
      documentType="billing.credit-notes.document"
      documentLabel={String(record["noteType"] ?? "Credit Note")}
      vendorName={vendor?.businessName ?? "Your Business"}
      vendorId={params.vendorId}
      record={record}
      columns={creditNoteColumns}
      sequenceIndex={sequenceIndex}
      lineItems={record["items"] as LineItem[] | undefined}
    />
  );
}
