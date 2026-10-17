/** Reject invalid windows before any availability query or write. */
export function requireBookingWindow(start: Date, end: Date): void {
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
    throw new Error("Booking end must be after its valid start date and time.");
  }
}

export function requirePaise(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > 2147483647) throw new Error("Enter a valid non-negative amount.");
}
