import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listVenues, listEventResources } from "@/lib/eventBooking";
import { BookingForm } from "../BookingForm";
import { createEventBookingAction } from "../[recordId]/actions";

registerPage({
  id: "event-booking.create",
  moduleSlug: "event-booking",
  title: "Event / Venue Booking — Create",
  path: "/partner/[partnerId]/event-booking/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Creates a new EventBooking — venue, event name/type, date range, customer, status, amounts — plus one or more EventResourceAllocation rows (resource + quantity), fail-closed blocked server-side on a double-booking conflict (same resource, overlapping time, another non-Cancelled booking).",
  sourceFile: "src/app/partner/[partnerId]/event-booking/new/page.tsx",
});

export default async function NewEventBookingPage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("event-booking");
  const [venues, resources] = await Promise.all([listVenues(params.partnerId), listEventResources(params.partnerId)]);

  return (
    <AppShell topbarTitle={`New Booking — ${mod?.label ?? "Event / Venue Booking"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Event Booking</h1>
        <div className="mt-6">
          <BookingForm
            venues={venues.map((v) => ({ id: v.id, name: v.name }))}
            resources={resources.filter((r) => r.isActive).map((r) => ({ id: r.id, name: r.name, category: r.category }))}
            submitLabel="Create Booking"
            action={createEventBookingAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
