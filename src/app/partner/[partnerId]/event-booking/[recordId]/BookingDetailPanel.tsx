"use client";

import { useState, useTransition } from "react";
import { StatusChip, type StatusVariant } from "@/components/StatusChip";
import { EVENT_BOOKING_STATUSES, type EventBookingStatus } from "@/lib/eventBooking";
import { setBookingStatusAction, recordPaymentAction } from "./actions";

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Requested: "neutral",
  Confirmed: "teal",
  InProgress: "warning",
  Completed: "success",
  Cancelled: "danger",
};

export function BookingDetailPanel({
  partnerId,
  bookingId,
  status: initialStatus,
  totalAmount,
  amountPaid: initialAmountPaid,
  venueName,
  allocations,
}: {
  partnerId: string;
  bookingId: string;
  status: EventBookingStatus;
  totalAmount: number; // paise
  amountPaid: number; // paise
  venueName: string | null;
  allocations: { resourceName: string; quantity: number }[];
}) {
  const [status, setStatus] = useState(initialStatus);
  const [amountPaid, setAmountPaid] = useState(initialAmountPaid);
  const [paymentInput, setPaymentInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function changeStatus(next: EventBookingStatus) {
    setError(null);
    startTransition(async () => {
      const result = await setBookingStatusAction(partnerId, bookingId, next);
      if (!result.ok) {
        setError(result.message ?? "Could not update status.");
        return;
      }
      setStatus(next);
    });
  }

  function recordPayment() {
    const amount = Number(paymentInput);
    if (!amount || amount <= 0) {
      setError("Enter a payment amount greater than zero.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await recordPaymentAction(partnerId, bookingId, amount);
      if (!result.ok) {
        setError(result.message ?? "Could not record payment.");
        return;
      }
      setAmountPaid((prev) => prev + Math.round(amount * 100));
      setPaymentInput("");
    });
  }

  const balance = Math.max(0, totalAmount - amountPaid);

  return (
    <div>
      {error && <div className="mb-4 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>}

      <div className="rounded-md border border-border bg-bg-raised p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className={labelClass}>Status</div>
            <div className="mt-1 flex items-center gap-2">
              <StatusChip label={status} variant={STATUS_VARIANT[status] ?? "neutral"} />
              <select
                className="rounded-md border border-border bg-bg px-2 py-1 text-xs text-text"
                value={status}
                onChange={(e) => changeStatus(e.target.value as EventBookingStatus)}
                disabled={pending}
              >
                {EVENT_BOOKING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <div className={labelClass}>Venue</div>
            <div className="mt-1 text-sm text-text">{venueName ?? "—"}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-bg px-3 py-2 text-sm">
            <div className={labelClass}>Total</div>
            <div className="mt-0.5 text-text">Rs {(totalAmount / 100).toLocaleString("en-IN")}</div>
          </div>
          <div className="rounded-md border border-border bg-bg px-3 py-2 text-sm">
            <div className={labelClass}>Paid</div>
            <div className="mt-0.5 text-text">Rs {(amountPaid / 100).toLocaleString("en-IN")}</div>
          </div>
          <div className="rounded-md border border-border bg-bg px-3 py-2 text-sm">
            <div className={labelClass}>Balance</div>
            <div className="mt-0.5 text-text">Rs {(balance / 100).toLocaleString("en-IN")}</div>
          </div>
        </div>

        {balance > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              placeholder="Amount received (Rs)"
              value={paymentInput}
              onChange={(e) => setPaymentInput(e.target.value)}
              className="w-48 rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text"
            />
            <button type="button" className="btn-outline text-xs" onClick={recordPayment} disabled={pending}>
              Record Payment
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-md border border-border bg-bg-raised p-4">
        <h2 className="font-display text-base font-bold text-text">Resource Allocations</h2>
        {allocations.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">No resources allocated.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-text">
            {allocations.map((a, i) => (
              <li key={i}>
                {a.resourceName} × {a.quantity}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const labelClass = "text-xs font-semibold uppercase tracking-wide text-text-muted";
