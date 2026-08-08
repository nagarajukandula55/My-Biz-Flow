import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { buildVendorAdminNavGroups } from "@/lib/designer/vendorAdminNav";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RecordDetail } from "@/components/RecordDetail";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { getRentalsRecord, getRentalsDetailFields, getRentalsTimeline, rentalsRelated, rentalsColumns } from "@/lib/sample-data/rentals";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";

registerPage({
  id: "rentals.detail",
  moduleSlug: "rentals",
  title: "Rentals / Booking — Detail",
  path: "/vendor/[vendorId]/rentals/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single booking, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header.",
  sourceFile: "src/app/vendor/[vendorId]/rentals/[recordId]/page.tsx",
});

export default async function RentalsDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const mod = await getModule("rentals");
  const record = getRentalsRecord(params.recordId);
  const fields = await applyCustomizationsToDetailFields("rentals.detail", getRentalsDetailFields(record), rentalsColumns);
  const timeline = getRentalsTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell vendorId={params.vendorId} navGroups={await buildVendorAdminNavGroups(undefined, "rentals")} topbarTitle={mod?.label ?? "Rentals / Booking"}>
      <div>
        <Link
          href={`/vendor/${params.vendorId}/rentals`}
          className="text-sm font-semibold text-teal hover:underline"
        >
          &larr; Back to Rentals / Booking
        </Link>

        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={rentalsRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-sm text-text-muted">Booking detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/vendor/${params.vendorId}/rentals/${params.recordId}/edit`}
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
