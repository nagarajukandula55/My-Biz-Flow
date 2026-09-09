"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StatusChip } from "@/components/StatusChip";
import type { ProviderRecord } from "@/lib/fieldForce/providersData";
import { findEligibleProviders } from "@/lib/fieldForce/matching";

type BookingOption = {
  id: string;
  bookingNumber: string;
  customerName: string;
  serviceId: string;
  serviceName: string;
  pincode: string;
  state: string;
};
type AllocationRow = {
  id: string;
  providerName: string;
  bookingId: string;
  bookingNumber: string;
  status: string;
  assignedAt: string;
};

const STATUS_OPTIONS = ["requested", "confirmed", "assigned", "en-route", "in-progress", "completed", "cancelled"] as const;

export function AllocationsClient({
  providers,
  unassignedBookings,
  allocations,
  partnerId,
  allocateAction,
  updateStatusAction,
}: {
  providers: ProviderRecord[];
  unassignedBookings: BookingOption[];
  allocations: AllocationRow[];
  partnerId: string;
  allocateAction: (formData: FormData) => void;
  updateStatusAction: (formData: FormData) => void;
}) {
  const [bookingId, setBookingId] = useState("");

  const selectedBooking = unassignedBookings.find((b) => b.id === bookingId);

  const candidates = useMemo(() => {
    if (!selectedBooking) return [];
    return findEligibleProviders(providers, {
      pincode: selectedBooking.pincode,
      state: selectedBooking.state,
      requiredServiceIds: [selectedBooking.serviceId],
    });
  }, [providers, selectedBooking]);

  return (
    <div>
      <div className="rounded-md border border-border bg-bg-raised p-4">
        <h2 className="font-display text-base font-bold text-text">Find providers for a booking</h2>
        <p className="mt-1 text-sm text-text-muted">
          Pick an unassigned booking — its service and address pincode narrow the provider pool automatically.
          This is the manual fallback path; most bookings get dispatched automatically once a Customer requests
          them (see the Bookings/Notifications feed).
        </p>
        <div className="mt-3">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
            Unassigned Booking
          </label>
          <select
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            className="w-full max-w-lg rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
          >
            <option value="">Select a booking…</option>
            {unassignedBookings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bookingNumber} — {b.customerName} — {b.serviceName} ({b.pincode})
              </option>
            ))}
          </select>
          {unassignedBookings.length === 0 && (
            <p className="mt-2 text-sm text-text-muted">
              No unassigned bookings right now. <Link href={`/partner/${partnerId}/field-force/bookings/new`} className="text-teal hover:underline">Create one</Link>.
            </p>
          )}
        </div>

        <div className="mt-4">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Matching providers ({candidates.length})
          </div>
          {!selectedBooking ? (
            <p className="text-sm text-text-muted">Select a booking above to see matches.</p>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-text-muted">No eligible providers cover this service/pincode yet.</p>
          ) : (
            <div className="space-y-2">
              {candidates.map((c) => (
                <form key={c.id} action={allocateAction} className="flex items-center justify-between rounded-md border border-border bg-bg px-3 py-2">
                  <input type="hidden" name="bookingId" value={bookingId} />
                  <input type="hidden" name="providerId" value={c.id} />
                  <div className="text-sm text-text">
                    {c.name} <span className="text-text-muted">({c.phone} · {c.skillLevel})</span>
                  </div>
                  <button type="submit" className="btn-accent text-xs">
                    Assign
                  </button>
                </form>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-display text-base font-bold text-text">Current allocations</h2>
        {allocations.length === 0 ? (
          <p className="mt-2 rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
            No allocations yet.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {allocations.map((a) => (
              <div key={a.id} className="flex flex-col gap-2 rounded-md border border-border bg-bg-raised px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link href={`/partner/${partnerId}/field-force/bookings/${a.bookingId}`} className="text-sm font-semibold text-teal hover:underline">
                    {a.bookingNumber}
                  </Link>
                  <div className="text-xs text-text-muted">{a.providerName}</div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusChip
                    label={a.status}
                    variant={a.status === "completed" ? "success" : a.status === "cancelled" ? "danger" : "teal"}
                  />
                  <form action={updateStatusAction} className="flex items-center gap-1">
                    <input type="hidden" name="allocationId" value={a.id} />
                    <select name="status" defaultValue={a.status} className="rounded-md border border-border bg-bg px-2 py-1 text-xs text-text">
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
