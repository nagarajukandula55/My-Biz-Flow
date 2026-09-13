import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import {
  getScFaultCodeDetailFields,
  getScFaultCodeTimeline,
  scFaultCodeRelated,
  scFaultCodeColumns,
} from "@/lib/sample-data/service-centre-fault-codes";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";

registerPage({
  id: "service-centre.fault-codes.detail",
  moduleSlug: "service-centre",
  title: "Fault Codes — Detail",
  path: "/partner/[partnerId]/service-centre/fault-codes/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation: "Read-only detail view of a single fault code.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/fault-codes/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ScFaultCodeDetailPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "service-centre-fault-codes", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields(
    "service-centre.fault-codes.detail",
    getScFaultCodeDetailFields(record),
    scFaultCodeColumns
  );
  const timeline = getScFaultCodeTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell topbarTitle="Fault Codes">
      <div>
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={scFaultCodeRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Fault code detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/service-centre/fault-codes`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/partner/${params.partnerId}/service-centre/fault-codes/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
              </div>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
