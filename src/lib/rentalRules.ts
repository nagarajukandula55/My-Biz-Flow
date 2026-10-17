import { istStartOfDay } from "@/lib/format";

/** Days overdue (0 if not overdue / already returned), computed off bookingEnd vs. now, by IST calendar day (late-fee/refund-affecting — see refundableAmount above). */
export function computeOverdueDays(bookingEnd: Date | undefined, returned: boolean, now: Date = new Date()): number {
  if (returned || !bookingEnd) return 0;
  if (Number.isNaN(bookingEnd.getTime())) return 0;
  const diffMs = istStartOfDay(now).getTime() - istStartOfDay(bookingEnd).getTime();
  const days = Math.floor(diffMs / 86400000);
  return days > 0 ? days : 0;
}
