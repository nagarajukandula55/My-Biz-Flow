import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { StatusChip, type StatusVariant } from "@/components/StatusChip";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listEventBookingsInRange } from "@/lib/eventBooking";

registerPage({
  id: "event-booking.calendar",
  moduleSlug: "event-booking",
  title: "Event / Venue Booking — Calendar",
  path: "/partner/[partnerId]/event-booking/calendar",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "A server-rendered booking calendar: EventBookings within a date range (default the current month) are fetched and grouped by their start date, one card per day, with prev/next month navigation via ?month=YYYY-MM searchParams. Not a full drag-drop widget — a simple list-grouped-by-date view, per this pass's scope decision.",
  sourceFile: "src/app/partner/[partnerId]/event-booking/calendar/page.tsx",
});

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Requested: "neutral",
  Confirmed: "teal",
  InProgress: "warning",
  Completed: "success",
  Cancelled: "danger",
};

function parseMonth(month?: string): { year: number; monthIndex: number } {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    return { year: y, monthIndex: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
}

function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function dateKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD
}

export default async function EventBookingCalendarPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams?: { month?: string };
}) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("event-booking");
  const { year, monthIndex } = parseMonth(searchParams?.month);

  const rangeStart = new Date(year, monthIndex, 1);
  const rangeEnd = new Date(year, monthIndex + 1, 1);
  const prevMonth = new Date(year, monthIndex - 1, 1);
  const nextMonth = new Date(year, monthIndex + 1, 1);

  const bookings = await listEventBookingsInRange(params.partnerId, rangeStart, rangeEnd);

  const byDate = new Map<string, typeof bookings>();
  for (const b of bookings) {
    // A booking spanning multiple days shows on each day it overlaps within
    // the visible range (clamped to rangeStart/rangeEnd), so a multi-day
    // event isn't invisible on any day but its start day.
    const spanStart = b.startAt < rangeStart ? rangeStart : b.startAt;
    const spanEnd = b.endAt > rangeEnd ? rangeEnd : b.endAt;
    const cursor = new Date(spanStart.getFullYear(), spanStart.getMonth(), spanStart.getDate());
    const last = new Date(spanEnd.getFullYear(), spanEnd.getMonth(), spanEnd.getDate());
    while (cursor <= last) {
      const key = dateKey(cursor);
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(b);
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const days: string[] = [];
  for (let d = new Date(rangeStart); d < rangeEnd; d.setDate(d.getDate() + 1)) {
    days.push(dateKey(new Date(d)));
  }

  const monthLabel = rangeStart.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

  return (
    <AppShell topbarTitle={`Calendar — ${mod?.label ?? "Event / Venue Booking"}`}>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link href={`/partner/${params.partnerId}/event-booking/calendar?month=${monthKey(prevMonth.getFullYear(), prevMonth.getMonth())}`} className="btn-outline">
              &larr; Prev
            </Link>
            <h1 className="font-display text-xl font-bold text-text">{monthLabel}</h1>
            <Link href={`/partner/${params.partnerId}/event-booking/calendar?month=${monthKey(nextMonth.getFullYear(), nextMonth.getMonth())}`} className="btn-outline">
              Next &rarr;
            </Link>
          </div>
          <Link href={`/partner/${params.partnerId}/event-booking`} className="btn-outline">
            List View
          </Link>
        </div>

        <div className="mt-6 space-y-3">
          {days.map((day) => {
            const dayBookings = byDate.get(day) ?? [];
            if (dayBookings.length === 0) return null;
            const dayLabel = new Date(`${day}T00:00:00`).toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
              timeZone: "Asia/Kolkata",
            });
            return (
              <div key={day} className="rounded-md border border-border bg-bg-raised p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">{dayLabel}</div>
                <div className="mt-2 space-y-2">
                  {dayBookings.map((b) => (
                    <Link
                      key={b.id}
                      href={`/partner/${params.partnerId}/event-booking/${b.id}`}
                      className="flex items-center justify-between rounded-md border border-border bg-bg px-3 py-2 text-sm hover:border-accent"
                    >
                      <div>
                        <div className="font-medium text-text">{b.eventName}</div>
                        <div className="text-xs text-text-muted">
                          {b.venue?.name ?? "No venue"} ·{" "}
                          {b.startAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })} –{" "}
                          {b.endAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}
                        </div>
                      </div>
                      <StatusChip label={b.status} variant={STATUS_VARIANT[b.status] ?? "neutral"} />
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
          {bookings.length === 0 && (
            <p className="rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
              No bookings this month.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
