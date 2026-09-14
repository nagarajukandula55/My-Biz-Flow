import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import {
  getScStaffNameDetailFields,
  getScStaffNameTimeline,
  scStaffNameRelated,
  scStaffNameColumns,
} from "@/lib/sample-data/service-centre-staff-names";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";

registerPage({
  id: "service-centre.staff-names.detail",
  moduleSlug: "service-centre",
  title: "Staff Names — Detail",
  path: "/partner/[partnerId]/service-centre/staff-names/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation: "Read-only detail view of one staff name on the roster.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/staff-names/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ScStaffNameDetailPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "service-centre-staff-names", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields(
    "service-centre.staff-names.detail",
    getScStaffNameDetailFields(record),
    scStaffNameColumns
  );
  const timeline = getScStaffNameTimeline(record);
  const recordLabel = String(record["name"] ?? params.recordId);

  return (
    <AppShell topbarTitle="Staff Names">
      <div>
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={scStaffNameRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Staff name detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/service-centre/staff-names`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/partner/${params.partnerId}/service-centre/staff-names/${params.recordId}/edit`}
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
