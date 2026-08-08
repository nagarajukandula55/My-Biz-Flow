import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RecordDetail } from "@/components/RecordDetail";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { getEducationRecord, getEducationDetailFields, getEducationTimeline, educationRelated, educationColumns } from "@/lib/sample-data/education";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";

registerPage({
  id: "education.detail",
  moduleSlug: "education",
  title: "Education / Coaching — Detail",
  path: "/vendor/[vendorId]/education/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single enrollment, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header.",
  sourceFile: "src/app/vendor/[vendorId]/education/[recordId]/page.tsx",
});

export default function EducationDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const mod = getModule("education");
  const record = getEducationRecord(params.recordId);
  const fields = applyCustomizationsToDetailFields("education.detail", getEducationDetailFields(record), educationColumns);
  const timeline = getEducationTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell navGroups={buildVendorNavGroups("education")} topbarTitle={mod?.label ?? "Education / Coaching"}>
      <div>
        <Link
          href={`/vendor/${params.vendorId}/education`}
          className="text-sm font-semibold text-teal hover:underline"
        >
          &larr; Back to Education / Coaching
        </Link>

        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={educationRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-sm text-text-muted">Enrollment detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/vendor/${params.vendorId}/education/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
                <ConfirmDeleteDialog recordLabel={recordLabel} />
              </div>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
