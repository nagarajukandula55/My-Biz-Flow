import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import type { Column, Row } from "@/components/DataTable";
import type { StatusVariant } from "@/components/StatusChip";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listEventBookings } from "@/lib/eventBooking";
import { EventBookingClientTable } from "./EventBookingClientTable";

registerPage({
  id: "event-booking.list",
  moduleSlug: "event-booking",
  title: "Event / Venue Booking — List",
  path: "/partner/[partnerId]/event-booking",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
  ],
  explanation: "Lists every EventBooking (Prisma-backed — see prisma/schema.prisma's Event Booking block) for this partner in a sortable table, with a \"+ New\" action and row-click navigation into the booking's detail view. Links to the Calendar, Venues, and Resources sub-pages.",
  sourceFile: "src/app/partner/[partnerId]/event-booking/page.tsx",
});

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Requested: "neutral",
  Confirmed: "teal",
  InProgress: "warning",
  Completed: "success",
  Cancelled: "danger",
};

const columns: Column[] = [
  { key: "eventName", label: "Event Name", type: "text" },
  { key: "venueName", label: "Venue", type: "text" },
  { key: "startAt", label: "Start", type: "datetime" },
  { key: "endAt", label: "End", type: "datetime" },
  { key: "customerName", label: "Customer", type: "text" },
  { key: "bookingType", label: "Type", type: "text" },
  { key: "totalAmountRupees", label: "Total", type: "currency" },
  { key: "amountPaidRupees", label: "Paid", type: "currency" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
];

export default async function EventBookingPage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("event-booking");
  const bookings = await listEventBookings(params.partnerId);
  const rows: Row[] = bookings.map((b) => ({
    id: b.id,
    eventName: b.eventName,
    venueName: b.venue?.name ?? "",
    startAt: b.startAt.toISOString(),
    endAt: b.endAt.toISOString(),
    customerName: b.customerName,
    bookingType: b.bookingType,
    totalAmountRupees: b.totalAmount / 100,
    amountPaidRupees: b.amountPaid / 100,
    status: b.status,
  }));

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Event / Venue Booking"}
      topbarActions={
        <div className="flex items-center gap-2">
          <Link href={`/partner/${params.partnerId}/event-booking/calendar`} className="btn-outline">
            Calendar
          </Link>
          <Link href={`/partner/${params.partnerId}/event-booking/new`} className="btn-accent">
            + New Booking
          </Link>
        </div>
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <EventBookingClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
