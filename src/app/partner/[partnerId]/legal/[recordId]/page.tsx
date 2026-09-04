import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import { getLegalDetailFields, getLegalTimeline, legalRelated, legalColumns, type MatterStage, type TimeLogEntry } from "@/lib/sample-data/legal";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";
import { MatterLifecycle } from "./MatterLifecycle";

registerPage({
  id: "legal.detail",
  moduleSlug: "legal",
  title: "Legal / Case Management — Detail",
  path: "/partner/[partnerId]/legal/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single matter, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header.",
  sourceFile: "src/app/partner/[partnerId]/legal/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function LegalDetailPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const mod = await getModule("legal");
  const record = await getBusinessRecord(params.partnerId, "legal", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("legal.detail", getLegalDetailFields(record), legalColumns);
  const timeline = getLegalTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell topbarTitle={mod?.label ?? "Legal / Case Management"}>
      <div>
        <MatterLifecycle
          partnerId={params.partnerId}
          matterId={params.recordId}
          initialStage={(record["stage"] as MatterStage | undefined) ?? "New"}
          initialTimeLog={(record["timeLog"] as TimeLogEntry[] | undefined) ?? []}
          defaultRate={Number(record["hourlyRate"]) || 0}
          courtDate={record["nextHearingDate"] as string | null | undefined}
          invoiceId={record["invoiceId"] ? String(record["invoiceId"]) : undefined}
        />

        <div className="mt-8">
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={legalRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Matter detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/legal`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/partner/${params.partnerId}/legal/${params.recordId}/document`}
                  className="btn-outline"
                >
                  View document
                </Link>
                <Link
                  href={`/partner/${params.partnerId}/legal/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
                <DeleteBusinessRecordButton partnerId={params.partnerId} moduleSlug="legal" recordKey={params.recordId} recordLabel={recordLabel} />
              </div>
            </div>
          }
        />
        </div>
      </div>
    </AppShell>
  );
}
