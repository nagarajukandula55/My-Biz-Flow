"use server";

import { revalidatePath } from "next/cache";
import { getBusinessRecord, listBusinessRecords, updateBusinessRecord } from "@/lib/businessRecords";

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

/**
 * Server-side availability check: an asset cannot be double-booked for
 * overlapping date ranges. Scans every other rentals BusinessRecord for
 * this partner with the same assetName/assetId, excluding the booking
 * being edited, and rejects bookings that aren't Cancelled.
 */
export async function checkAssetAvailabilityAction(
  partnerId: string,
  bookingId: string,
  assetName: string,
  bookingStart: string,
  bookingEnd: string
): Promise<{ conflict: boolean; conflictingBookingId?: string }> {
  if (!assetName || !bookingStart || !bookingEnd) return { conflict: false };
  const rows = await listBusinessRecords(partnerId, "rentals");
  for (const row of rows) {
    const id = String(row["id"]);
    if (id === bookingId) continue;
    if (row["status"] === "Cancelled") continue;
    const rowAsset = (row["assetId"] as string | undefined) ?? (row["assetName"] as string | undefined);
    if (rowAsset !== assetName) continue;
    const start = row["bookingStart"] as string | undefined;
    const end = row["bookingEnd"] as string | undefined;
    if (!start || !end) continue;
    if (overlaps(bookingStart, bookingEnd, start, end)) {
      return { conflict: true, conflictingBookingId: id };
    }
  }
  return { conflict: false };
}

/**
 * Creates or edits a booking's asset/date range after a server-side
 * double-booking check. Returns { ok:false, message } instead of
 * persisting when a conflict is found.
 */
export async function saveBookingDatesAction(
  partnerId: string,
  bookingId: string,
  assetName: string,
  bookingStart: string,
  bookingEnd: string,
  depositAmount?: number
): Promise<{ ok: boolean; message?: string }> {
  const check = await checkAssetAvailabilityAction(partnerId, bookingId, assetName, bookingStart, bookingEnd);
  if (check.conflict) {
    return {
      ok: false,
      message: `${assetName} is already booked (${check.conflictingBookingId}) for an overlapping date range. Choose different dates.`,
    };
  }
  const record = await getBusinessRecord(partnerId, "rentals", bookingId);
  if (!record) return { ok: false, message: "Booking not found." };
  await updateBusinessRecord(partnerId, "rentals", bookingId, {
    ...record,
    assetName,
    bookingStart,
    bookingEnd,
    ...(depositAmount !== undefined ? { depositAmount } : {}),
  });
  revalidatePath(`/partner/${partnerId}/rentals/${bookingId}`);
  revalidatePath(`/partner/${partnerId}/rentals`);
  return { ok: true };
}

/**
 * Records asset return: staff enters a damage charge (deducted from the
 * deposit), and refundableAmount = depositAmount - damageCharge is
 * computed server-side, clamped to >= 0 — never trusts a client-submitted
 * refundableAmount.
 */
export async function returnAssetAction(
  partnerId: string,
  bookingId: string,
  damageCharge: number,
  returnNotes?: string
): Promise<{ ok: boolean; refundableAmount?: number; message?: string }> {
  const record = await getBusinessRecord(partnerId, "rentals", bookingId);
  if (!record) return { ok: false, message: "Booking not found." };
  const depositAmount = Number(record["depositAmount"] ?? 0);
  const safeDamage = Math.max(0, Number(damageCharge) || 0);
  const refundableAmount = Math.max(0, depositAmount - safeDamage);

  await updateBusinessRecord(partnerId, "rentals", bookingId, {
    ...record,
    damageCharge: safeDamage,
    refundableAmount,
    returned: true,
    returnedAt: new Date().toISOString(),
    returnNotes,
    status: "Completed",
  });
  revalidatePath(`/partner/${partnerId}/rentals/${bookingId}`);
  revalidatePath(`/partner/${partnerId}/rentals`);
  return { ok: true, refundableAmount };
}
