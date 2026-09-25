import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { getEventBooking } from "@/lib/eventBooking";
import { BookingDetailPanel } from "./BookingDetailPanel";
import { DeleteBookingButton } from "./DeleteBookingButton";

registerPage({
  id: "event-booking.detail",
  moduleSlug: "event-booking",
  title: "Event / Venue Booking — Detail",
  path: "/partner/[partnerId]/event-booking/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Detail view of a single EventBooking — status/payment quick actions (BookingDetailPanel, which fire the eventBookingConfirmed/eventPaymentReceived Telegram alerts on an actual transition) plus its resource allocations, with Edit and Delete actions in the header.",
  sourceFile: "src/app/partner/[partnerId]/event-booking/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function EventBookingDetailPage({ params }: { params: { partnerId: string; recordId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("event-booking");
  const booking = await getEventBooking(params.partnerId, params.recordId);
  if (!booking) notFound();

  return (
    <AppShell topbarTitle={mod?.label ?? "Event / Venue Booking"}>
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-text">{booking.eventName}</h1>
            <p className="mt-1 text-xs text-text-muted">
              {booking.customerName}
              {booking.customerContact ? ` — ${booking.customerContact}` : ""} ·{" "}
              {booking.startAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} &rarr;{" "}
              {booking.endAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/partner/${params.partnerId}/event-booking`} className="btn-outline">
              &larr; Back
            </Link>
            <Link href={`/partner/${params.partnerId}/event-booking/${params.recordId}/edit`} className="btn-outline">
              Edit
            </Link>
            <DeleteBookingButton partnerId={params.partnerId} bookingId={params.recordId} label={booking.eventName} />
          </div>
        </div>

        <div className="mt-6">
          <BookingDetailPanel
            partnerId={params.partnerId}
            bookingId={booking.id}
            status={booking.status as "Requested" | "Confirmed" | "InProgress" | "Completed" | "Cancelled"}
            totalAmount={booking.totalAmount}
            amountPaid={booking.amountPaid}
            venueName={booking.venue?.name ?? null}
            allocations={booking.resourceAllocations.map((a) => ({ resourceName: a.resource.name, quantity: a.quantity }))}
          />
        </div>
      </div>
    </AppShell>
  );
}
