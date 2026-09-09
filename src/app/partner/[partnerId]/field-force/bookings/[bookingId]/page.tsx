import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { getBooking } from "@/lib/fieldForce/bookingsData";
import { listProviders } from "@/lib/fieldForce/providersData";
import { getPartner } from "@/lib/partnerData";
import { env } from "@/lib/env";
import { updateBookingStatusAction, assignProviderAction, rateBookingAction, setFinalPriceAction } from "@/lib/fieldForce/actions";
import { BookingDetailClient } from "./BookingDetailClient";

registerPage({
  id: "field-force.bookings.detail",
  moduleSlug: "field-force",
  title: "Field Force — Booking Detail",
  path: "/partner/[partnerId]/field-force/bookings/[bookingId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "One Booking's full lifecycle in one place: customer/address/service details, dispatch (find & assign an eligible provider via findEligibleProviders), status timeline, final-price settlement, Razorpay payment collection (using the platform commission split — see commission.ts), and post-completion rating capture. Real data — Prisma-backed (Booking table + its relations).",
  sourceFile: "src/app/partner/[partnerId]/field-force/bookings/[bookingId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function BookingDetailPage({ params }: { params: { partnerId: string; bookingId: string } }) {
  const [booking, providers, partner] = await Promise.all([
    getBooking(params.bookingId, params.partnerId),
    listProviders(params.partnerId),
    getPartner(params.partnerId),
  ]);

  if (!booking) notFound();

  return (
    <AppShell topbarTitle={`Booking ${booking.bookingNumber}`}>
      <BookingDetailClient
        partnerId={params.partnerId}
        booking={{
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          customerName: booking.customerName,
          customerPhone: booking.customerPhone,
          addressLine: booking.addressLine,
          addressState: booking.addressState,
          addressPincode: booking.addressPincode,
          serviceId: booking.serviceId,
          serviceName: booking.serviceName,
          providerId: booking.providerId,
          providerName: booking.providerName,
          providerPhone: booking.providerPhone,
          status: booking.status,
          scheduledAt: booking.scheduledAt.toISOString(),
          slotLabel: booking.slotLabel,
          priceAmount: booking.priceAmount,
          finalPrice: booking.finalPrice,
          paymentStatus: booking.paymentStatus,
          notes: booking.notes,
          customerPayable: booking.customerPayable,
          ratingValue: booking.ratingValue,
          ratingComment: booking.ratingComment,
        }}
        providers={providers}
        publicKeyId={env.razorpayPublicKeyId()}
        partnerName={partner?.businessName ?? ""}
        partnerEmail={partner?.businessEmail ?? ""}
        partnerContact={partner?.businessContact ?? ""}
        updateStatusAction={updateBookingStatusAction.bind(null, params.partnerId)}
        assignProviderAction={assignProviderAction.bind(null, params.partnerId)}
        rateBookingAction={rateBookingAction.bind(null, params.partnerId)}
        setFinalPriceAction={setFinalPriceAction.bind(null, params.partnerId)}
      />
    </AppShell>
  );
}
