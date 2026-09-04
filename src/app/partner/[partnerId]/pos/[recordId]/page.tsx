import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import { getPosDetailFields, getPosTimeline, posRelated, posColumns, extractSaleFromRecord } from "@/lib/sample-data/pos";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";
import { SaleLinesTable } from "./SaleLinesTable";

export const dynamic = "force-dynamic";

registerPage({
  id: "pos.detail",
  moduleSlug: "pos",
  title: "POS — Detail",
  path: "/partner/[partnerId]/pos/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Detail view of a single sale: the shared RecordDetail component (field grid + activity timeline) plus a real SaleLinesTable panel showing every cart line, computed totals, tenders, and a Void Sale action (restores deducted stock) for a Completed sale. Real data — Prisma-backed (BusinessRecord table).",
  sourceFile: "src/app/partner/[partnerId]/pos/[recordId]/page.tsx",
});

export default async function PosDetailPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const mod = await getModule("pos");
  const record = await getBusinessRecord(params.partnerId, "pos", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("pos.detail", getPosDetailFields(record), posColumns);
  const timeline = getPosTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);
  const sale = extractSaleFromRecord(record);

  return (
    <AppShell topbarTitle={mod?.label ?? "POS"}>
      <div>
        <SaleLinesTable partnerId={params.partnerId} saleId={params.recordId} sale={sale} />

        <div className="mt-8">
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={posRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Sale detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/pos`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/partner/${params.partnerId}/pos/${params.recordId}/document`}
                  className="btn-outline"
                >
                  Receipt
                </Link>
                <DeleteBusinessRecordButton
                  partnerId={params.partnerId}
                  moduleSlug="pos"
                  recordKey={params.recordId}
                  recordLabel={recordLabel}
                />
              </div>
            </div>
          }
        />
        </div>
      </div>
    </AppShell>
  );
}
