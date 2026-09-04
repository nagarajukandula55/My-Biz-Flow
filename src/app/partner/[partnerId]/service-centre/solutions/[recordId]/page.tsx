import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import {
  getSolutionDetailFields,
  getSolutionTimeline,
  solutionsRelated,
  solutionsColumns,
} from "@/lib/sample-data/solutions";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";

registerPage({
  id: "service-centre.solutions.detail",
  moduleSlug: "service-centre",
  title: "Solutions — Detail",
  path: "/partner/[partnerId]/service-centre/solutions/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation: "Read-only detail view of a single solution.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/solutions/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function SolutionDetailPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "service-centre-solutions", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields(
    "service-centre.solutions.detail",
    getSolutionDetailFields(record),
    solutionsColumns
  );
  const timeline = getSolutionTimeline(record);
  const recordLabel = String(record["title"] ?? params.recordId);

  return (
    <AppShell topbarTitle="Solutions">
      <div>
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={solutionsRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Solution detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/service-centre/solutions`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/partner/${params.partnerId}/service-centre/solutions/${params.recordId}/edit`}
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
