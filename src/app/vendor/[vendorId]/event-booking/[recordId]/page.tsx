import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RecordDetail } from "@/components/RecordDetail";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { getEventBookingRecord, getEventBookingDetailFields, getEventBookingTimeline, eventBookingRelated, eventBookingColumns } from "@/lib/sample-data/event-booking";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";

registerPage({
  id: "event-booking.detail",
  moduleSlug: "event-booking",
  title: "Event / Venue Booking — Detail",
  path: "/vendor/[vendorId]/event-booking/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single event, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header.",
  sourceFile: "src/app/vendor/[vendorId]/event-booking/[recordId]/page.tsx",
});

export default function EventBookingDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const mod = getModule("event-booking");
  const record = getEventBookingRecord(params.recordId);
  const fields = applyCustomizationsToDetailFields("event-booking.detail", getEventBookingDetailFields(record), eventBookingColumns);
  const timeline = getEventBookingTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  return (
    <AppShell navGroups={buildVendorNavGroups("event-booking")} topbarTitle={mod?.label ?? "Event / Venue Booking"}>
      <div>
        <Link
          href={`/vendor/${params.vendorId}/event-booking`}
          className="text-sm font-semibold text-teal hover:underline"
        >
          &larr; Back to Event / Venue Booking
        </Link>

        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={eventBookingRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-sm text-text-muted">Event detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/vendor/${params.vendorId}/event-booking/${params.recordId}/edit`}
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
