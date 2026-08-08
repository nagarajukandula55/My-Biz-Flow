import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RecordDetail } from "@/components/RecordDetail";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { getHrmsRecord, getHrmsDetailFields, getHrmsTimeline, hrmsRelated, hrmsColumns } from "@/lib/sample-data/hrms";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";

registerPage({
  id: "hrms.detail",
  moduleSlug: "hrms",
  title: "HRMS / Payroll — Detail",
  path: "/vendor/[vendorId]/hrms/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single employee, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header.",
  sourceFile: "src/app/vendor/[vendorId]/hrms/[recordId]/page.tsx",
});

export default async function HrmsDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const mod = await getModule("hrms");
  const record = getHrmsRecord(params.recordId);
  const fields = await applyCustomizationsToDetailFields("hrms.detail", getHrmsDetailFields(record), hrmsColumns);
  const timeline = getHrmsTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell navGroups={await buildVendorNavGroups("hrms")} topbarTitle={mod?.label ?? "HRMS / Payroll"}>
      <div>
        <Link
          href={`/vendor/${params.vendorId}/hrms`}
          className="text-sm font-semibold text-teal hover:underline"
        >
          &larr; Back to HRMS / Payroll
        </Link>

        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={hrmsRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-sm text-text-muted">Employee detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/vendor/${params.vendorId}/hrms/${params.recordId}/edit`}
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
