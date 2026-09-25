import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { getEventBooking, listVenues, listEventResources } from "@/lib/eventBooking";
import { BookingForm } from "../../BookingForm";
import { updateEventBookingAction } from "../actions";

registerPage({
  id: "event-booking.edit",
  moduleSlug: "event-booking",
  title: "Event / Venue Booking — Edit",
  path: "/partner/[partnerId]/event-booking/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Edits an existing EventBooking, including its resource allocations — re-runs the same fail-closed double-booking conflict check on save (excluding this booking's own existing allocations).",
  sourceFile: "src/app/partner/[partnerId]/event-booking/[recordId]/edit/page.tsx",
});

export default async function EditEventBookingPage({ params }: { params: { partnerId: string; recordId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("event-booking");
  const [booking, venues, resources] = await Promise.all([
    getEventBooking(params.partnerId, params.recordId),
    listVenues(params.partnerId),
    listEventResources(params.partnerId),
  ]);
  if (!booking) notFound();

  return (
    <AppShell topbarTitle={`Edit Booking — ${mod?.label ?? "Event / Venue Booking"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Event Booking</h1>
        <p className="mt-1 text-sm text-text-muted">{booking.eventName}</p>
        <div className="mt-6">
          <BookingForm
            venues={venues.map((v) => ({ id: v.id, name: v.name }))}
            resources={resources.filter((r) => r.isActive).map((r) => ({ id: r.id, name: r.name, category: r.category }))}
            initial={{
              venueId: booking.venueId,
              eventName: booking.eventName,
              bookingType: booking.bookingType as "OneTime" | "Recurring",
              startAt: booking.startAt,
              endAt: booking.endAt,
              customerName: booking.customerName,
              customerContact: booking.customerContact,
              status: booking.status as "Requested" | "Confirmed" | "InProgress" | "Completed" | "Cancelled",
              totalAmount: booking.totalAmount,
              amountPaid: booking.amountPaid,
              allocations: booking.resourceAllocations.map((a) => ({ resourceId: a.resourceId, quantity: a.quantity })),
            }}
            submitLabel="Save changes"
            action={updateEventBookingAction.bind(null, params.partnerId, params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
