import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import { getEventBookingDetailFields, getEventBookingTimeline, eventBookingRelated, eventBookingColumns, extractEventBookingLifecycle } from "@/lib/sample-data/event-booking";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";
import { EventBookingLifecycle } from "./EventBookingLifecycle";

registerPage({
  id: "event-booking.detail",
  moduleSlug: "event-booking",
  title: "Event / Venue Booking — Detail",
  path: "/partner/[partnerId]/event-booking/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single event, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header. The EventBookingLifecycle panel above it carries the real domain logic: a deposit/balance payment schedule with server-side Record Payment actions that create real Billing invoices (mirroring the service-centre invoice-creation pattern), and a manageable vendor/catering checklist.",
  sourceFile: "src/app/partner/[partnerId]/event-booking/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function EventBookingDetailPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const mod = await getModule("event-booking");
  const record = await getBusinessRecord(params.partnerId, "event-booking", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("event-booking.detail", getEventBookingDetailFields(record), eventBookingColumns);
  const timeline = getEventBookingTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);
  const lifecycle = extractEventBookingLifecycle(record);

  return (
    <AppShell topbarTitle={mod?.label ?? "Event / Venue Booking"}>
      <div>
        <EventBookingLifecycle
          partnerId={params.partnerId}
          eventId={recordLabel}
          initialTotalCost={lifecycle.totalCost}
          initialDepositAmount={lifecycle.depositAmount}
          initialDepositDueDate={lifecycle.depositDueDate}
          initialDepositPaid={lifecycle.depositPaid}
          initialBalanceAmount={lifecycle.balanceAmount}
          initialBalanceDueDate={lifecycle.balanceDueDate}
          initialBalancePaid={lifecycle.balancePaid}
          initialChecklist={lifecycle.checklist}
        />

        <div className="mt-8">
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={eventBookingRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Event detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/event-booking`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/partner/${params.partnerId}/event-booking/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
                <DeleteBusinessRecordButton partnerId={params.partnerId} moduleSlug="event-booking" recordKey={params.recordId} recordLabel={recordLabel} />
              </div>
            </div>
          }
        />
        </div>
      </div>
    </AppShell>
  );
}
