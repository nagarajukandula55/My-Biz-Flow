import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail, type RecordField } from "@/components/RecordDetail";
import { getLegalMatter, listLegalCourtDates, listLegalDocuments } from "@/lib/legal";
import { MatterLifecycle } from "./MatterLifecycle";
import { CourtDatesSection } from "./CourtDatesSection";
import { DocumentsSection } from "./DocumentsSection";

registerPage({
  id: "legal.detail",
  moduleSlug: "legal",
  title: "Legal / Case Management — Detail",
  path: "/partner/[partnerId]/legal/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [{ key: "field-grid", label: "Detail field grid" }],
  explanation:
    "Detail view of a single matter (LegalMatter — a real Prisma table), with a status control, a Court Dates sub-section (LegalCourtDate list + inline add form), and a Documents sub-section (LegalDocument list + inline add form, metadata only).",
  sourceFile: "src/app/partner/[partnerId]/legal/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function LegalDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; recordId: string };
  searchParams?: { created?: string; updated?: string };
}) {
  const mod = await getModule("legal");
  const record = await getLegalMatter(params.partnerId, params.recordId);
  if (!record) notFound();
  const [courtDates, documents] = await Promise.all([
    listLegalCourtDates(params.partnerId, params.recordId),
    listLegalDocuments(params.partnerId, params.recordId),
  ]);

  const fields: RecordField[] = [
    { label: "Matter #", value: record.matterNumber, type: "text" },
    { label: "Title", value: record.title, type: "text" },
    { label: "Client", value: record.clientName, type: "relation" },
    { label: "Matter Type", value: record.matterType ?? "—", type: "text" },
    { label: "Opened Date", value: record.openedDate, type: "date" },
    { label: "Closed Date", value: record.closedDate ?? "—", type: "date" },
  ];

  return (
    <AppShell topbarTitle={mod?.label ?? "Legal / Case Management"}>
      <div className="space-y-6">
        <MatterLifecycle partnerId={params.partnerId} matterId={params.recordId} initialStatus={record.status} />

        <RecordDetail
          fields={fields}
          recordLabel={record.matterNumber}
          searchParams={searchParams}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{record.matterNumber} — {record.title}</h1>
                <p className="mt-1 text-xs text-text-muted">Matter detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/legal`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link href={`/partner/${params.partnerId}/legal/${params.recordId}/document`} className="btn-outline">
                  View document
                </Link>
                <Link href={`/partner/${params.partnerId}/legal/${params.recordId}/edit`} className="btn-outline">
                  Edit
                </Link>
              </div>
            </div>
          }
        />

        <CourtDatesSection partnerId={params.partnerId} matterId={params.recordId} initialCourtDates={courtDates} />
        <DocumentsSection partnerId={params.partnerId} matterId={params.recordId} initialDocuments={documents} />
      </div>
    </AppShell>
  );
}
