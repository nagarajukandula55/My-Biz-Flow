import { notFound } from "next/navigation";
import { getPublicBookingByToken } from "@/lib/fieldForce/bookingsData";

export const dynamic = "force-dynamic";

const STEPS = ["requested", "confirmed", "assigned", "en-route", "in-progress", "completed"];
const LABELS: Record<string, string> = { requested: "Request received", confirmed: "Provider confirmed", assigned: "Provider assigned", "en-route": "Provider on the way", "in-progress": "Service in progress", completed: "Service completed", cancelled: "Booking cancelled" };

export default async function PublicFieldForceTrackingPage({ params }: { params: { token: string } }) {
  const booking = await getPublicBookingByToken(params.token);
  if (!booking) notFound();
  const current = booking.status === "cancelled" ? -1 : STEPS.indexOf(booking.status);
  return (
    <main className="mx-auto min-h-screen max-w-xl bg-bg px-6 py-12 text-text">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">Field Force</p>
      <h1 className="mt-2 font-display text-2xl font-bold">Track booking {booking.bookingNumber}</h1>
      <div className="mt-6 rounded-lg border border-border bg-bg-raised p-5">
        <p className="font-semibold">{booking.serviceName}</p>
        <p className="mt-1 text-sm text-text-muted">{booking.slotLabel} · {booking.scheduledAt.toLocaleDateString("en-IN")}</p>
        {booking.providerName && <p className="mt-3 text-sm">Service provider: {booking.providerName}</p>}
        <div className="mt-6 space-y-3">
          {booking.status === "cancelled" ? <div className="rounded-md bg-danger-soft p-3 text-sm">{LABELS.cancelled}</div> : STEPS.map((step, index) => (
            <div key={step} className={`flex items-center gap-3 text-sm ${index <= current ? "font-semibold text-text" : "text-text-muted"}`}>
              <span className={`h-3 w-3 rounded-full ${index <= current ? "bg-accent" : "bg-border"}`} />
              {LABELS[step]}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-4 text-xs text-text-muted">This page shows booking progress only. Sign in to view payment, contact and review details.</p>
    </main>
  );
}
