"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import {
  createEventBooking,
  updateEventBooking,
  deleteEventBooking,
  setEventBookingStatus,
  recordEventBookingPayment,
  type EventBookingStatus,
  type EventBookingType,
  type ResourceAllocationInput,
} from "@/lib/eventBooking";

export type BookingFormInput = {
  venueId: string;
  eventName: string;
  bookingType: EventBookingType;
  startAt: string; // datetime-local value
  endAt: string;
  customerName: string;
  customerContact: string;
  status: EventBookingStatus;
  totalAmountRupees: number;
  amountPaidRupees: number;
  allocations: ResourceAllocationInput[];
};

export type BookingActionResult = { ok: true; id: string } | { ok: false; message: string };

function toInput(values: BookingFormInput) {
  return {
    venueId: values.venueId || null,
    eventName: values.eventName,
    bookingType: values.bookingType,
    startAt: new Date(values.startAt),
    endAt: new Date(values.endAt),
    customerName: values.customerName,
    customerContact: values.customerContact,
    status: values.status,
    totalAmount: Math.round(values.totalAmountRupees * 100),
    amountPaid: Math.round(values.amountPaidRupees * 100),
    allocations: values.allocations,
  };
}

export async function createEventBookingAction(partnerId: string, values: BookingFormInput): Promise<BookingActionResult> {
  partnerId = await requireSessionPartnerId(partnerId);
  if (!values.eventName?.trim()) return { ok: false, message: "Event name is required." };
  if (!values.customerName?.trim()) return { ok: false, message: "Customer name is required." };
  if (!values.startAt || !values.endAt) return { ok: false, message: "Start and end date/time are required." };
  if (new Date(values.endAt) <= new Date(values.startAt)) return { ok: false, message: "End must be after start." };

  const input = toInput(values);
  const result = await createEventBooking(partnerId, input);
  if (!result.ok) {
    const conflictMsg = result.conflicts
      .map((c) => `${c.resourceName} is already booked on "${c.conflictingEventName}" (${c.conflictingBookingId})`)
      .join("; ");
    return { ok: false, message: `Resource conflict — ${conflictMsg}. Choose a different resource, quantity, or time.` };
  }
  revalidatePath(`/partner/${partnerId}/event-booking`);
  redirect(`/partner/${partnerId}/event-booking/${result.id}`);
}

export async function updateEventBookingAction(
  partnerId: string,
  bookingId: string,
  values: BookingFormInput
): Promise<BookingActionResult> {
  partnerId = await requireSessionPartnerId(partnerId);
  if (!values.eventName?.trim()) return { ok: false, message: "Event name is required." };
  if (!values.customerName?.trim()) return { ok: false, message: "Customer name is required." };
  if (!values.startAt || !values.endAt) return { ok: false, message: "Start and end date/time are required." };
  if (new Date(values.endAt) <= new Date(values.startAt)) return { ok: false, message: "End must be after start." };

  const input = toInput(values);
  const result = await updateEventBooking(partnerId, bookingId, input);
  if (!result.ok) {
    if (result.message) return { ok: false, message: result.message };
    const conflictMsg = result.conflicts
      .map((c) => `${c.resourceName} is already booked on "${c.conflictingEventName}" (${c.conflictingBookingId})`)
      .join("; ");
    return { ok: false, message: `Resource conflict — ${conflictMsg}. Choose a different resource, quantity, or time.` };
  }
  revalidatePath(`/partner/${partnerId}/event-booking/${bookingId}`);
  redirect(`/partner/${partnerId}/event-booking/${bookingId}`);
}

export async function setBookingStatusAction(
  partnerId: string,
  bookingId: string,
  status: EventBookingStatus
): Promise<{ ok: boolean; message?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  try {
    await setEventBookingStatus(partnerId, bookingId, status);
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Could not update status." };
  }
  revalidatePath(`/partner/${partnerId}/event-booking/${bookingId}`);
  return { ok: true };
}

export async function recordPaymentAction(
  partnerId: string,
  bookingId: string,
  additionalAmountRupees: number
): Promise<{ ok: boolean; message?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  try {
    await recordEventBookingPayment(partnerId, bookingId, additionalAmountRupees);
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Could not record payment." };
  }
  revalidatePath(`/partner/${partnerId}/event-booking/${bookingId}`);
  return { ok: true };
}

export async function deleteEventBookingAction(partnerId: string, bookingId: string): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  await deleteEventBooking(partnerId, bookingId);
  revalidatePath(`/partner/${partnerId}/event-booking`);
  redirect(`/partner/${partnerId}/event-booking`);
}
