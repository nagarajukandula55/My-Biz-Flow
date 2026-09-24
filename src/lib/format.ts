/** IST calendar-day key (YYYY-MM-DD in Asia/Kolkata) for bucketing/same-day comparisons — use instead of `Date#toDateString()`, which keys by the server/runner's local zone (UTC in production/CI) and can misbucket records near IST midnight. */
export function istDateKey(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(value); // en-CA formats as YYYY-MM-DD
}

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
 * Spreadsheet-safe date formatter for CSV/XLSX exports — plain ISO
 * `YYYY-MM-DD` (or `YYYY-MM-DD HH:mm` when the underlying value carries a
 * real time component), rendered in Asia/Kolkata. Deliberately NOT
 * `formatDate()`'s "24 Sep, 2026" display format: that contains a comma,
 * and a raw `Date`/`.toString()`/`.toLocaleString()` value would contain
 * weekday/month names and a timezone string — any of which, written
 * unescaped into a CSV cell, can misalign columns or show up as literal
 * junk text in Excel/Sheets. Use this (not formatDate/formatDateTime) for
 * every date/datetime field written into an export row.
 */
export function formatDateForExport(value: string, includeTime = false): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const datePart = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d); // YYYY-MM-DD
  if (!includeTime) return datePart;
  const timePart = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(d);
  return `${datePart} ${timePart}`;
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
