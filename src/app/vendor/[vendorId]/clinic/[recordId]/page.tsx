import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RecordDetail } from "@/components/RecordDetail";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { getClinicRecord, getClinicDetailFields, getClinicTimeline, clinicRelated, clinicColumns } from "@/lib/sample-data/clinic";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";

registerPage({
  id: "clinic.detail",
  moduleSlug: "clinic",
  title: "Clinic — Detail",
  path: "/vendor/[vendorId]/clinic/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single appointment, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header.",
  sourceFile: "src/app/vendor/[vendorId]/clinic/[recordId]/page.tsx",
});

export default function ClinicDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const mod = getModule("clinic");
  const record = getClinicRecord(params.recordId);
  const fields = applyCustomizationsToDetailFields("clinic.detail", getClinicDetailFields(record), clinicColumns);
  const timeline = getClinicTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell navGroups={buildVendorNavGroups("clinic")} topbarTitle={mod?.label ?? "Clinic"}>
      <div className="p-6">
        <Link
          href={`/vendor/${params.vendorId}/clinic`}
          className="text-sm font-semibold text-teal hover:underline"
        >
          &larr; Back to Clinic
        </Link>

        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={clinicRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-sm text-text-muted">Appointment detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/vendor/${params.vendorId}/clinic/${params.recordId}/edit`}
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
