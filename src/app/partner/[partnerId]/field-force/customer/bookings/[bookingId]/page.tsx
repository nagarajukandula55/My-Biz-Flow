import { redirect, notFound } from "next/navigation";
import { registerPage } from "@/lib/designer/registry";
import { getCurrentCustomer } from "@/lib/fieldForce/customerAuth";
import { getBooking } from "@/lib/fieldForce/bookingsData";
import { rateCustomerBookingAction } from "@/lib/fieldForce/actions";
import { env } from "@/lib/env";
import { getLocaleFromCookie } from "@/lib/i18n/cookie";
import { isRtl } from "@/lib/i18n/locales";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { CustomerBookingDetailClient } from "./CustomerBookingDetailClient";

registerPage({
  id: "field-force.customer.booking-detail",
  moduleSlug: "field-force",
  title: "Field Force — Customer Booking Detail",
  path: "/partner/[partnerId]/field-force/customer/bookings/[bookingId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "A Customer's view of their own booking — the assigned Provider's contact details only render once the booking is confirmed or later. Also where the Customer pays (Razorpay, using the platform commission settlement) and rates a completed job themselves — no ops involvement needed for the standalone app.",
  sourceFile: "src/app/partner/[partnerId]/field-force/customer/bookings/[bookingId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function CustomerBookingDetailPage({ params }: { params: { partnerId: string; bookingId: string } }) {
  const customer = await getCurrentCustomer(params.partnerId);
  if (!customer) redirect(`/partner/${params.partnerId}/field-force/customer/login`);

  const booking = await getBooking(params.bookingId, params.partnerId);
  if (!booking || booking.customerId !== customer.id) notFound();

  const locale = getLocaleFromCookie();

  return (
    <div dir={isRtl(locale) ? "rtl" : "ltr"} className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-text">{booking.bookingNumber}</h1>
        <LanguageSwitcher current={locale} />
      </div>

      <CustomerBookingDetailClient
        booking={{
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          serviceName: booking.serviceName,
          addressLine: booking.addressLine,
          slotLabel: booking.slotLabel,
          status: booking.status,
          priceAmount: booking.priceAmount,
          finalPrice: booking.finalPrice,
          customerPayable: booking.customerPayable,
          paymentStatus: booking.paymentStatus,
          providerName: booking.providerName,
          providerPhone: booking.providerPhone,
          ratingValue: booking.ratingValue,
        }}
        locale={locale}
        publicKeyId={env.razorpayPublicKeyId()}
        customerName={customer.name}
        customerEmail={customer.email ?? ""}
        customerPhone={customer.phone}
        partnerId={params.partnerId}
        rateAction={rateCustomerBookingAction.bind(null, params.partnerId, customer.id)}
      />
    </div>
  );
}
