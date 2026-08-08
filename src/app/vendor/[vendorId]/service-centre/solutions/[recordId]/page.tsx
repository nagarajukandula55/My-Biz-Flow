import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RecordDetail } from "@/components/RecordDetail";
import {
  getSolutionRecord,
  getSolutionDetailFields,
  getSolutionTimeline,
  solutionsRelated,
  solutionsColumns,
} from "@/lib/sample-data/solutions";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";

registerPage({
  id: "service-centre.solutions.detail",
  moduleSlug: "service-centre",
  title: "Solutions — Detail",
  path: "/vendor/[vendorId]/service-centre/solutions/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation: "Read-only detail view of a single solution.",
  sourceFile: "src/app/vendor/[vendorId]/service-centre/solutions/[recordId]/page.tsx",
});

export default async function SolutionDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const record = getSolutionRecord(params.recordId);
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
                <Link href={`/vendor/${params.vendorId}/service-centre/solutions`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/vendor/${params.vendorId}/service-centre/solutions/${params.recordId}/edit`}
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
