"use client";

import { useState, useTransition } from "react";
import { EVENT_BOOKING_STATUSES, type EventBookingStatus, type EventBookingType } from "@/lib/eventBooking";
import type { BookingFormInput, BookingActionResult } from "./[recordId]/actions";

type VenueOption = { id: string; name: string };
type ResourceOption = { id: string; name: string; category: string | null };

const inputClass = "mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-text-muted";

/** Converts a Date (or null) to the `datetime-local` input value format. */
function toDatetimeLocal(d?: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BookingForm({
  venues,
  resources,
  initial,
  submitLabel,
  action,
}: {
  venues: VenueOption[];
  resources: ResourceOption[];
  initial?: {
    venueId?: string | null;
    eventName?: string;
    bookingType?: EventBookingType;
    startAt?: Date;
    endAt?: Date;
    customerName?: string;
    customerContact?: string | null;
    status?: EventBookingStatus;
    totalAmount?: number; // paise
    amountPaid?: number; // paise
    allocations?: { resourceId: string; quantity: number }[];
  };
  submitLabel: string;
  action: (values: BookingFormInput) => Promise<BookingActionResult>;
}) {
  const [venueId, setVenueId] = useState(initial?.venueId ?? "");
  const [eventName, setEventName] = useState(initial?.eventName ?? "");
  const [bookingType, setBookingType] = useState<EventBookingType>(initial?.bookingType ?? "OneTime");
  const [startAt, setStartAt] = useState(toDatetimeLocal(initial?.startAt));
  const [endAt, setEndAt] = useState(toDatetimeLocal(initial?.endAt));
  const [customerName, setCustomerName] = useState(initial?.customerName ?? "");
  const [customerContact, setCustomerContact] = useState(initial?.customerContact ?? "");
  const [status, setStatus] = useState<EventBookingStatus>(initial?.status ?? "Requested");
  const [totalAmountRupees, setTotalAmountRupees] = useState(String(initial?.totalAmount ? initial.totalAmount / 100 : ""));
  const [amountPaidRupees, setAmountPaidRupees] = useState(String(initial?.amountPaid ? initial.amountPaid / 100 : "0"));
  const [allocations, setAllocations] = useState<{ resourceId: string; quantity: number }[]>(
    initial?.allocations && initial.allocations.length > 0 ? initial.allocations : []
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function addAllocation() {
    if (resources.length === 0) return;
    setAllocations((prev) => [...prev, { resourceId: resources[0].id, quantity: 1 }]);
  }
  function updateAllocation(index: number, patch: Partial<{ resourceId: string; quantity: number }>) {
    setAllocations((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }
  function removeAllocation(index: number) {
    setAllocations((prev) => prev.filter((_, i) => i !== index));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await action({
        venueId,
        eventName,
        bookingType,
        startAt,
        endAt,
        customerName,
        customerContact,
        status,
        totalAmountRupees: Number(totalAmountRupees) || 0,
        amountPaidRupees: Number(amountPaidRupees) || 0,
        allocations,
      });
      if (result && !result.ok) {
        setError(result.message);
      }
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      {error && (
        <div className="rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Event Name *</label>
          <input className={inputClass} value={eventName} onChange={(e) => setEventName(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Venue</label>
          <select className={inputClass} value={venueId} onChange={(e) => setVenueId(e.target.value)}>
            <option value="">— none —</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Booking Type</label>
          <select className={inputClass} value={bookingType} onChange={(e) => setBookingType(e.target.value as EventBookingType)}>
            <option value="OneTime">One-Time</option>
            <option value="Recurring">Recurring</option>
          </select>
          {bookingType === "Recurring" && (
            <p className="mt-1 text-xs text-text-muted">
              This booking represents the whole recurring series as a single row — per-occurrence scheduling isn&apos;t modeled in this pass.
            </p>
          )}
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as EventBookingStatus)}>
            {EVENT_BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Start *</label>
          <input type="datetime-local" className={inputClass} value={startAt} onChange={(e) => setStartAt(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>End *</label>
          <input type="datetime-local" className={inputClass} value={endAt} onChange={(e) => setEndAt(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Customer Name *</label>
          <input className={inputClass} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Customer Contact</label>
          <input className={inputClass} value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Total Amount (Rs)</label>
          <input type="number" className={inputClass} value={totalAmountRupees} onChange={(e) => setTotalAmountRupees(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Amount Paid (Rs)</label>
          <input type="number" className={inputClass} value={amountPaidRupees} onChange={(e) => setAmountPaidRupees(e.target.value)} />
        </div>
      </div>

      <div className="rounded-md border border-border bg-bg-raised p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-text">Resource Allocations</h2>
          <button type="button" className="btn-outline text-xs" onClick={addAllocation} disabled={resources.length === 0}>
            + Add Resource
          </button>
        </div>
        {resources.length === 0 && <p className="mt-2 text-xs text-text-muted">No resources set up yet — create one under Resources.</p>}
        {allocations.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">No resources allocated.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {allocations.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  className={`${inputClass} mt-0 flex-1`}
                  value={a.resourceId}
                  onChange={(e) => updateAllocation(i, { resourceId: e.target.value })}
                >
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                      {r.category ? ` (${r.category})` : ""}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  className={`${inputClass} mt-0 w-24`}
                  value={a.quantity}
                  onChange={(e) => updateAllocation(i, { quantity: Number(e.target.value) || 1 })}
                />
                <button type="button" className="text-xs text-danger hover:underline" onClick={() => removeAllocation(i)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-text-muted">
          A resource already allocated to another non-cancelled booking with an overlapping time is blocked on save.
        </p>
      </div>

      <button type="button" className="btn-accent" onClick={submit} disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}
