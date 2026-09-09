import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { getBooking } from "@/lib/fieldForce/bookingsData";
import { updateBookingDetailsAction } from "@/lib/fieldForce/actions";
import { EditBookingForm } from "./EditBookingForm";

registerPage({
  id: "field-force.bookings.edit",
  moduleSlug: "field-force",
  title: "Field Force — Edit Booking",
  path: "/partner/[partnerId]/field-force/bookings/[bookingId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Reschedule a Booking's date/slot or edit its notes. Customer, address, service, and price are fixed once a booking is created — cancel and rebook if any of those need to change.",
  sourceFile: "src/app/partner/[partnerId]/field-force/bookings/[bookingId]/edit/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function EditBookingPage({ params }: { params: { partnerId: string; bookingId: string } }) {
  const booking = await getBooking(params.bookingId, params.partnerId);
  if (!booking) notFound();

  const action = updateBookingDetailsAction.bind(null, params.partnerId, params.bookingId);

  return (
    <AppShell topbarTitle={`Edit ${booking.bookingNumber}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Booking — {booking.bookingNumber}</h1>
        <div className="mt-6">
          <EditBookingForm
            scheduledDate={booking.scheduledAt.toISOString().slice(0, 10)}
            slotLabel={booking.slotLabel}
            notes={booking.notes ?? ""}
            action={action}
          />
        </div>
      </div>
    </AppShell>
  );
}
