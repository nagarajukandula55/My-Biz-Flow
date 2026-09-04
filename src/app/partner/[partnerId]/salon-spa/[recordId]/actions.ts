"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createBusinessRecord, updateBusinessRecord, getBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { DEFAULT_BOOKING_DURATION_MINUTES } from "@/lib/sample-data/salon-spa";

// Independent implementation of the same overlap-window shape used by the
// clinic module's slot-conflict check — deliberately not shared/imported,
// per this module's own scope: a stylist/therapist booking conflict is
// its own domain rule, not a re-export of the clinic's doctor rule.

function windowFor(dateTimeIso: string, durationMinutes: number): { start: number; end: number } {
  const start = new Date(dateTimeIso).getTime();
  return { start, end: start + durationMinutes * 60_000 };
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Real schedule-conflict check: the same stylist/therapist cannot have two
 * overlapping bookings. Queries every other salon-spa BusinessRecord for
 * this partner (tenant-scoped) with the same stylist, and rejects if the
 * proposed [start, start+duration) window overlaps an existing
 * non-cancelled booking's window.
 */
export async function findSalonSpaScheduleConflict(
  partnerId: string,
  stylist: string,
  appointmentDate: string,
  durationMinutes: number = DEFAULT_BOOKING_DURATION_MINUTES,
  excludeRecordId?: string
): Promise<{ conflict: false } | { conflict: true; withRecordId: string }> {
  if (!stylist || !appointmentDate) return { conflict: false };
  const { start, end } = windowFor(appointmentDate, durationMinutes || DEFAULT_BOOKING_DURATION_MINUTES);
  if (Number.isNaN(start)) return { conflict: false };

  const records = await listBusinessRecords(partnerId, "salon-spa");
  for (const r of records) {
    if (excludeRecordId && String(r["id"]) === excludeRecordId) continue;
    if (String(r["stylist"] ?? "") !== stylist) continue;
    if (r["status"] === "Cancelled" || r["status"] === "No-show") continue;
    const otherDate = r["appointmentDate"];
    if (!otherDate) continue;
    const otherDuration = Number(r["duration"]) || DEFAULT_BOOKING_DURATION_MINUTES;
    const { start: oStart, end: oEnd } = windowFor(String(otherDate), otherDuration);
    if (Number.isNaN(oStart)) continue;
    if (overlaps(start, end, oStart, oEnd)) {
      return { conflict: true, withRecordId: String(r["id"]) };
    }
  }
  return { conflict: false };
}

/**
 * Creates a new booking, rejecting it server-side if the stylist is
 * already booked in an overlapping window. On conflict, redirects back to
 * the /new form with a ?conflict= message. Bind with .bind(null, partnerId)
 * before passing as RecordForm's `action` prop.
 */
export async function createSalonSpaBookingAction(partnerId: string, values: Record<string, unknown>): Promise<void> {
  const stylist = String(values["stylist"] ?? "");
  const appointmentDate = String(values["appointmentDate"] ?? "");
  const durationMinutes = Number(values["duration"]) || DEFAULT_BOOKING_DURATION_MINUTES;

  const conflict = await findSalonSpaScheduleConflict(partnerId, stylist, appointmentDate, durationMinutes);
  if (conflict.conflict) {
    const qs = new URLSearchParams({
      conflict: `${stylist} already has a booking overlapping this time (${conflict.withRecordId}). Pick a different slot or stylist.`,
    });
    redirect(`/partner/${partnerId}/salon-spa/new?${qs.toString()}`);
  }

  const record = await createBusinessRecord(partnerId, "salon-spa", values);
  revalidatePath(`/partner/${partnerId}/salon-spa`);
  redirect(`/partner/${partnerId}/salon-spa/${record.id}`);
}

/**
 * Edits a booking (including rescheduling it), rejecting the save
 * server-side if the new window conflicts with another booking for the
 * same stylist. Bind with .bind(null, partnerId, recordId).
 */
export async function updateSalonSpaBookingAction(
  partnerId: string,
  recordId: string,
  values: Record<string, unknown>
): Promise<void> {
  const stylist = String(values["stylist"] ?? "");
  const appointmentDate = String(values["appointmentDate"] ?? "");
  const durationMinutes = Number(values["duration"]) || DEFAULT_BOOKING_DURATION_MINUTES;

  const conflict = await findSalonSpaScheduleConflict(partnerId, stylist, appointmentDate, durationMinutes, recordId);
  if (conflict.conflict) {
    const qs = new URLSearchParams({
      conflict: `${stylist} already has a booking overlapping this time (${conflict.withRecordId}). Pick a different slot or stylist.`,
    });
    redirect(`/partner/${partnerId}/salon-spa/${recordId}/edit?${qs.toString()}`);
  }

  await updateBusinessRecord(partnerId, "salon-spa", recordId, values);
  revalidatePath(`/partner/${partnerId}/salon-spa`);
  revalidatePath(`/partner/${partnerId}/salon-spa/${recordId}`);
  redirect(`/partner/${partnerId}/salon-spa/${recordId}`);
}

/**
 * Marks a booking Completed and computes the stylist's commission amount
 * server-side from the record's own stored price/commissionPercent —
 * never trusts a client-submitted commission figure.
 */
export async function completeSalonSpaBookingAction(partnerId: string, recordId: string): Promise<void> {
  const record = await getBusinessRecord(partnerId, "salon-spa", recordId);
  if (!record) return;
  const price = Number(record["price"] ?? 0);
  const commissionPercent = Number(record["commissionPercent"] ?? 0);
  const commissionAmount = Math.round((price * commissionPercent) / 100);
  await updateBusinessRecord(partnerId, "salon-spa", recordId, {
    ...record,
    status: "Completed",
    commissionAmount,
  });
  revalidatePath(`/partner/${partnerId}/salon-spa/${recordId}`);
}

/**
 * Persists a real Billing invoice for a completed booking's service price
 * — same Billing BusinessRecord creation call as the clinic and
 * service-centre modules use, guarded so it only fires once per booking.
 */
export async function createInvoiceFromBookingAction(partnerId: string, recordId: string): Promise<void> {
  const record = await getBusinessRecord(partnerId, "salon-spa", recordId);
  if (!record) return;
  if (record["status"] !== "Completed") return;
  if (record["invoiceId"]) return; // already invoiced — don't double-create

  const price = Number(record["price"] ?? 0);
  const taxAmount = Math.round(price * 0.18);
  const totalAmount = price + taxAmount;

  const invoice = await createBusinessRecord(partnerId, "billing", {
    customer: record["customer"] ?? "",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date().toISOString().slice(0, 10),
    lineItemsSummary: `${record["service"] ?? "Service"} — ${record["stylist"] ?? "Stylist"}`,
    subtotal: price,
    taxAmount,
    totalAmount,
    paymentStatus: "Draft",
    paymentMode: undefined,
    sourceBookingId: recordId,
  });

  await updateBusinessRecord(partnerId, "salon-spa", recordId, { ...record, invoiceId: invoice.id });
  revalidatePath(`/partner/${partnerId}/salon-spa/${recordId}`);
}
