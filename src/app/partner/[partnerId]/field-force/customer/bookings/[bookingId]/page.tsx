import { redirect, notFound } from "next/navigation";
import { registerPage } from "@/lib/designer/registry";
import { getCurrentCustomer } from "@/lib/fieldForce/customerAuth";
import { getBooking } from "@/lib/fieldForce/bookingsData";
import { getLocaleFromCookie } from "@/lib/i18n/cookie";
import { t, isRtl } from "@/lib/i18n/locales";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { StatusChip } from "@/components/StatusChip";

registerPage({
  id: "field-force.customer.booking-detail",
  moduleSlug: "field-force",
  title: "Field Force — Customer Booking Detail",
  path: "/partner/[partnerId]/field-force/customer/bookings/[bookingId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "A Customer's view of their own booking — the assigned Provider's contact details only render once the booking is confirmed or later, matching the reveal-after-acceptance flow.",
  sourceFile: "src/app/partner/[partnerId]/field-force/customer/bookings/[bookingId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function CustomerBookingDetailPage({ params }: { params: { partnerId: string; bookingId: string } }) {
  const customer = await getCurrentCustomer(params.partnerId);
  if (!customer) redirect(`/partner/${params.partnerId}/field-force/customer/login`);

  const booking = await getBooking(params.bookingId, params.partnerId);
  if (!booking || booking.customerId !== customer.id) notFound();

  const locale = getLocaleFromCookie();
  const contactVisible = booking.status !== "requested" && booking.status !== "cancelled";

  return (
    <div dir={isRtl(locale) ? "rtl" : "ltr"} className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-text">{booking.bookingNumber}</h1>
        <LanguageSwitcher current={locale} />
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-bg-raised p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">{booking.serviceName}</span>
          <StatusChip label={booking.status} variant={booking.status === "completed" ? "success" : booking.status === "cancelled" ? "danger" : "teal"} />
        </div>
        <div className="text-sm text-text">{booking.addressLine}</div>
        <div className="text-sm text-text-muted">{booking.slotLabel}</div>
        <div className="font-mono text-sm tabular-nums text-text">
          ₹{((booking.finalPrice ?? booking.priceAmount) / 100).toLocaleString("en-IN")}
        </div>

        {booking.providerName ? (
          contactVisible ? (
            <div className="mt-2 rounded-md border border-border bg-bg p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t(locale, "providerContactRevealed")}</div>
              <div className="mt-1 text-sm text-text">{booking.providerName} — {booking.providerPhone}</div>
            </div>
          ) : (
            <p className="text-sm text-text-muted">{t(locale, "waitingForProvider")}</p>
          )
        ) : (
          <p className="text-sm text-text-muted">{t(locale, "waitingForProvider")}</p>
        )}
      </div>
    </div>
  );
}
