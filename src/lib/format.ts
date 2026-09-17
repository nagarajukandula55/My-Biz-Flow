export function formatCurrencyINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    // Without an explicit timeZone, Intl.DateTimeFormat renders in the
    // server's local zone (UTC in production), not IST — dates near
    // midnight IST could shift by a day. All timestamps in this app are
    // for an India-based business, so pin this explicitly.
    timeZone: "Asia/Kolkata",
  }).format(d);
}

/**
 * Same as formatDate but also includes the time-of-day — for anything that
 * logs a real moment an action happened (activity timelines, audit trails),
 * as opposed to a plain user-entered date field. formatDate() alone drops
 * the time entirely, which is wrong for a log entry even when the
 * underlying timestamp DOES carry a real time component (e.g. a
 * stageHistory entry's `at`, stamped via `new Date().toISOString()`).
 */
export function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    // See formatDate() above — without this, times render in the
    // server's local zone (UTC in production) instead of IST, off by
    // 5:30 hours from what actually happened.
    timeZone: "Asia/Kolkata",
  }).format(d);
}
