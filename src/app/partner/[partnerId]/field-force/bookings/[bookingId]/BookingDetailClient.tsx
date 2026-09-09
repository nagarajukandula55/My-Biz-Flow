"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RecordDetail, type RecordField, type TimelineEntry } from "@/components/RecordDetail";
import { StatusChip } from "@/components/StatusChip";
import { RazorpayCheckoutButton } from "@/components/RazorpayCheckoutButton";
import { findEligibleProviders } from "@/lib/fieldForce/matching";
import type { ProviderRecord } from "@/lib/fieldForce/providersData";

const STATUS_OPTIONS = ["requested", "confirmed", "assigned", "en-route", "in-progress", "completed", "cancelled"] as const;

export function BookingDetailClient({
  partnerId,
  booking,
  providers,
  publicKeyId,
  partnerName,
  partnerEmail,
  partnerContact,
  updateStatusAction,
  assignProviderAction,
  rateBookingAction,
  setFinalPriceAction,
}: {
  partnerId: string;
  booking: {
    id: string;
    bookingNumber: string;
    customerName: string;
    customerPhone: string;
    addressLine: string;
    addressState: string;
    addressPincode: string;
    serviceId: string;
    serviceName: string;
    providerId: string | null;
    providerName: string | null;
    providerPhone: string | null;
    status: string;
    scheduledAt: string;
    slotLabel: string;
    priceAmount: number;
    finalPrice: number | null;
    paymentStatus: string;
    notes: string | null;
    customerPayable: number | null;
    ratingValue: number | null;
    ratingComment: string | null;
  };
  providers: ProviderRecord[];
  publicKeyId?: string;
  partnerName: string;
  partnerEmail: string;
  partnerContact: string;
  updateStatusAction: (formData: FormData) => void;
  assignProviderAction: (formData: FormData) => void;
  rateBookingAction: (formData: FormData) => void;
  setFinalPriceAction: (formData: FormData) => void;
}) {
  const [showAssign, setShowAssign] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const contactVisible = booking.status !== "requested" && booking.status !== "cancelled";

  const candidates = useMemo(() => {
    if (!showAssign) return [];
    return findEligibleProviders(providers, {
      pincode: booking.addressPincode,
      state: booking.addressState,
      requiredServiceIds: [booking.serviceId],
    });
  }, [providers, showAssign, booking]);

  const fields: RecordField[] = [
    { label: "Customer", value: booking.customerName, type: "text" },
    { label: "Phone", value: booking.customerPhone, type: "phone" },
    { label: "Address", value: booking.addressLine, type: "text" },
    { label: "Service", value: booking.serviceName, type: "text" },
    { label: "Provider", value: booking.providerName ?? "Not assigned", type: "text" },
    ...(contactVisible && booking.providerPhone ? [{ label: "Provider Contact", value: booking.providerPhone, type: "phone" as const }] : []),
    { label: "Scheduled", value: booking.scheduledAt, type: "date" },
    { label: "Slot", value: booking.slotLabel, type: "text" },
    { label: "Standard Rate", value: booking.priceAmount / 100, type: "currency" },
    ...(booking.finalPrice != null ? [{ label: "Final Price", value: booking.finalPrice / 100, type: "currency" as const }] : []),
    { label: "Payment", value: booking.paymentStatus, type: "select", chipVariant: booking.paymentStatus === "paid" ? "success" : "warning" },
    { label: "Notes", value: booking.notes || "—", type: "text" },
  ];
  if (booking.ratingValue) {
    fields.push({ label: "Rating", value: booking.ratingValue, type: "rating" });
  }

  const timeline: TimelineEntry[] = [
    { id: "created", label: `Booking ${booking.bookingNumber} created`, timestamp: booking.scheduledAt },
  ];
  if (booking.providerName) {
    timeline.push({ id: "assigned", label: `Assigned to ${booking.providerName}`, timestamp: booking.scheduledAt });
  }

  return (
    <div>
      <RecordDetail
        fields={fields}
        timeline={timeline}
        headerSlot={
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-bg-raised p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-xl font-bold text-text">{booking.bookingNumber}</h1>
              <p className="mt-1 text-sm text-text-muted">{booking.serviceName}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusChip
                label={booking.status}
                variant={booking.status === "completed" ? "success" : booking.status === "cancelled" ? "danger" : "teal"}
              />
              <form action={updateStatusAction} className="flex items-center gap-1">
                <input type="hidden" name="bookingId" value={booking.id} />
                <select name="status" defaultValue={booking.status} className="rounded-md border border-border bg-bg px-2 py-1 text-xs text-text">
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn-ghost text-xs">
                  Update
                </button>
              </form>
              <Link href={`/partner/${partnerId}/field-force/bookings/${booking.id}/edit`} className="btn-outline text-xs">
                Reschedule / Edit
              </Link>
            </div>
          </div>
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-bg-raised p-5">
          <h3 className="mb-3 font-display text-base font-bold text-text">Provider dispatch</h3>
          {booking.providerName ? (
            <p className="text-sm text-text">
              Assigned to <span className="font-semibold">{booking.providerName}</span>
              {contactVisible && booking.providerPhone ? ` (${booking.providerPhone})` : ""}.
            </p>
          ) : (
            <>
              <button type="button" onClick={() => setShowAssign((v) => !v)} className="btn-accent text-xs">
                {showAssign ? "Hide matches" : "Find & assign provider"}
              </button>
              {showAssign && (
                <div className="mt-3 space-y-2">
                  {candidates.length === 0 ? (
                    <p className="text-sm text-text-muted">No eligible providers cover this service/pincode yet.</p>
                  ) : (
                    candidates.map((c) => (
                      <form key={c.id} action={assignProviderAction} className="flex items-center justify-between rounded-md border border-border bg-bg px-3 py-2">
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <input type="hidden" name="providerId" value={c.id} />
                        <div className="text-sm text-text">
                          {c.name} <span className="text-text-muted">({c.phone} · {c.skillLevel})</span>
                        </div>
                        <button type="submit" className="btn-accent text-xs">
                          Assign
                        </button>
                      </form>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="rounded-lg border border-border bg-bg-raised p-5">
          <h3 className="mb-3 font-display text-base font-bold text-text">Final price</h3>
          <p className="mb-2 text-xs text-text-muted">
            Once the customer and provider settle the actual price by conversation, record it here — it's used
            for payment collection instead of the standard rate.
          </p>
          <form action={setFinalPriceAction} className="flex items-center gap-2">
            <input type="hidden" name="bookingId" value={booking.id} />
            <input
              name="amount"
              type="number"
              min="0"
              step="1"
              defaultValue={(booking.finalPrice ?? booking.priceAmount) / 100}
              className="w-32 rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text"
            />
            <button type="submit" className="btn-outline text-xs">
              Save
            </button>
          </form>
        </div>

        <div className="rounded-lg border border-border bg-bg-raised p-5 lg:col-span-2">
          <h3 className="mb-3 font-display text-base font-bold text-text">Payment</h3>
          {booking.paymentStatus === "paid" ? (
            <StatusChip label="Paid" variant="success" />
          ) : (
            <RazorpayCheckoutButton
              partnerId={partnerId}
              partnerName={partnerName}
              partnerEmail={partnerEmail}
              partnerContact={partnerContact}
              amount={(booking.customerPayable ?? booking.finalPrice ?? booking.priceAmount) / 100}
              publicKeyId={publicKeyId}
              createOrderUrl="/api/field-force/payment/create-order"
              verifyUrl="/api/field-force/payment/verify"
              extraBody={{ bookingId: booking.id }}
              description={`Booking ${booking.bookingNumber}`}
            />
          )}
        </div>

        {booking.status === "completed" && !booking.ratingValue && (
          <div className="rounded-lg border border-border bg-bg-raised p-5 lg:col-span-2">
            <h3 className="mb-3 font-display text-base font-bold text-text">Rate this job</h3>
            <form action={rateBookingAction} className="space-y-3">
              <input type="hidden" name="bookingId" value={booking.id} />
              <input type="hidden" name="ratingValue" value={ratingValue} />
              <div className="flex items-center gap-1 text-2xl text-accent">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setRatingValue(n)} aria-label={`${n} star`}>
                    {n <= ratingValue ? "★" : <span className="text-border">★</span>}
                  </button>
                ))}
              </div>
              <textarea name="ratingComment" rows={2} placeholder="Optional comment" className="w-full max-w-lg rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
              <button type="submit" className="btn-accent text-xs">
                Submit Rating
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
