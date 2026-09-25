import { DocumentView } from "@/components/DocumentView";
import { legalMatterColumns } from "../../LegalClientTable";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getPartner } from "@/lib/partnerData";
import { getLegalMatter, listLegalMatters } from "@/lib/legal";

registerPage({
  id: "legal.document",
  moduleSlug: "legal",
  title: "Engagement Letter — Document",
  path: "/partner/[partnerId]/legal/[recordId]/document",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [
    { key: "document-template", label: "Engagement Letter HTML template (placeholders)" },
  ],
  explanation:
    "Renders a Legal matter (now a real LegalMatter Prisma row) as a printable engagement letter. Same template-or-default rendering as every other document page; see billing.document for the full mechanism.",
  sourceFile: "src/app/partner/[partnerId]/legal/[recordId]/document/page.tsx",
});

export default async function LegalDocumentPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const record = await getLegalMatter(params.partnerId, params.recordId);
  if (!record) notFound();
  const partner = await getPartner(params.partnerId);
  // Deterministic peek at this matter's position among the partner's own
  // matters — mirrors getBusinessRecordSequenceIndex's role for the old
  // BusinessRecord store, just computed over the real LegalMatter table.
  const all = await listLegalMatters(params.partnerId);
  const sequenceIndex = Math.max(0, all.findIndex((m) => m.id === record.id));

  return (
    <DocumentView
      pageId="legal.document"
      documentType="legal.document"
      documentLabel="Engagement Letter"
      partnerName={partner?.businessName ?? "Your Business"}
      partnerId={params.partnerId}
      record={{ ...record, id: record.matterNumber, client: record.clientName }}
      columns={legalMatterColumns}
      sequenceIndex={sequenceIndex}
    />
  );
}
