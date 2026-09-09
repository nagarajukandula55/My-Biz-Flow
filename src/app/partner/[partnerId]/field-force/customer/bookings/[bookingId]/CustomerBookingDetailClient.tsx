"use client";

import { useState } from "react";
import { StatusChip } from "@/components/StatusChip";
import { RazorpayCheckoutButton } from "@/components/RazorpayCheckoutButton";
import { t, type Locale } from "@/lib/i18n/locales";

export function CustomerBookingDetailClient({
  booking,
  locale,
  publicKeyId,
  customerName,
  customerEmail,
  customerPhone,
  partnerId,
  rateAction,
}: {
  booking: {
    id: string;
    bookingNumber: string;
    serviceName: string;
    addressLine: string;
    slotLabel: string;
    status: string;
    priceAmount: number;
    finalPrice: number | null;
    customerPayable: number | null;
    paymentStatus: string;
    providerName: string | null;
    providerPhone: string | null;
    ratingValue: number | null;
  };
  locale: Locale;
  publicKeyId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  partnerId: string;
  rateAction: (formData: FormData) => void;
}) {
  const [ratingValue, setRatingValue] = useState(5);
  const contactVisible = booking.status !== "requested" && booking.status !== "cancelled";

  return (
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
          <div className="rounded-md border border-border bg-bg p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t(locale, "providerContactRevealed")}</div>
            <div className="mt-1 text-sm text-text">{booking.providerName} — {booking.providerPhone}</div>
          </div>
        ) : (
          <p className="text-sm text-text-muted">{t(locale, "waitingForProvider")}</p>
        )
      ) : (
        <p className="text-sm text-text-muted">{t(locale, "waitingForProvider")}</p>
      )}

      {contactVisible && (
        <div className="rounded-md border border-border bg-bg p-3">
          {booking.paymentStatus === "paid" ? (
            <StatusChip label={t(locale, "paid")} variant="success" />
          ) : (
            <RazorpayCheckoutButton
              partnerId={partnerId}
              partnerName={customerName}
              partnerEmail={customerEmail}
              partnerContact={customerPhone}
              amount={(booking.customerPayable ?? booking.finalPrice ?? booking.priceAmount) / 100}
              publicKeyId={publicKeyId}
              createOrderUrl="/api/field-force/payment/create-order"
              verifyUrl="/api/field-force/payment/verify"
              extraBody={{ bookingId: booking.id }}
              description={`Booking ${booking.bookingNumber}`}
            />
          )}
        </div>
      )}

      {booking.status === "completed" && !booking.ratingValue && (
        <div className="rounded-md border border-border bg-bg p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{t(locale, "rateThisJob")}</div>
          <form action={rateAction} className="space-y-2">
            <input type="hidden" name="bookingId" value={booking.id} />
            <input type="hidden" name="ratingValue" value={ratingValue} />
            <div className="flex items-center gap-1 text-2xl text-accent">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRatingValue(n)} aria-label={`${n} star`}>
                  {n <= ratingValue ? "★" : <span className="text-border">★</span>}
                </button>
              ))}
            </div>
            <textarea name="ratingComment" rows={2} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
            <button type="submit" className="btn-accent text-xs">
              {t(locale, "submitRating")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
