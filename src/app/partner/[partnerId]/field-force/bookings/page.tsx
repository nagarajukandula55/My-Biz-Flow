import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { listBookingsForPartner } from "@/lib/fieldForce/bookingsData";
import { listNotifications } from "@/lib/fieldForce/notifications";
import { StatusChip } from "@/components/StatusChip";
import { BookingsClient } from "./BookingsClient";

registerPage({
  id: "field-force.bookings",
  moduleSlug: "field-force",
  title: "Field Force — Bookings",
  path: "/partner/[partnerId]/field-force/bookings",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [{ key: "view-toggle", label: "List / Kanban view options" }],
  explanation:
    "The customer-facing booking system's core list: every Booking (a customer's request for one priced Service), viewable as a table or a Kanban board across the requested -> confirmed -> assigned -> en-route -> in-progress -> completed/cancelled lifecycle. Real data — Prisma-backed (Booking table, scoped to this partner).",
  sourceFile: "src/app/partner/[partnerId]/field-force/bookings/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function BookingsPage({ params }: { params: { partnerId: string } }) {
  const [bookings, opsNotifications] = await Promise.all([
    listBookingsForPartner(params.partnerId),
    listNotifications(params.partnerId, "ops"),
  ]);

  const rows = bookings.map((b) => ({
    id: b.id,
    bookingNumber: b.bookingNumber,
    customerName: b.customerName,
    serviceName: b.serviceName,
    status: b.status,
    scheduledAt: b.scheduledAt.toISOString(),
    slotLabel: b.slotLabel,
    priceAmount: b.priceAmount,
    paymentStatus: b.paymentStatus,
    providerName: b.providerName,
  }));

  return (
    <AppShell topbarTitle="Field Force — Bookings">
      <div className="mbf-page">
        <div className="flex flex-col gap-3 border-b border-border bg-bg-raised px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-lg font-bold text-text">Bookings</h1>
            <p className="mt-1 text-sm text-text-muted">
              {bookings.length} booking{bookings.length === 1 ? "" : "s"} so far.
            </p>
          </div>
          <Link href={`/partner/${params.partnerId}/field-force/bookings/new`} className="btn-accent">
            + New Booking
          </Link>
        </div>
        {opsNotifications.some((n) => !n.isRead) && (
          <div className="border-b border-border bg-bg-raised px-6 py-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Notifications</div>
            <div className="space-y-1.5">
              {opsNotifications
                .filter((n) => !n.isRead)
                .slice(0, 5)
                .map((n) => (
                  <div key={n.id} className="flex items-center gap-2 text-sm text-text">
                    <StatusChip
                      label={n.type === "no-match" || n.type === "no-accept" ? "Action needed" : "Info"}
                      variant={n.type === "no-match" || n.type === "no-accept" ? "warning" : "neutral"}
                    />
                    <span className="font-semibold">{n.title}</span>
                    <span className="text-text-muted">— {n.body}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
        <div className="p-6">
          <BookingsClient partnerId={params.partnerId} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
