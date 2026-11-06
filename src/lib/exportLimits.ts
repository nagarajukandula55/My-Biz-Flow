const DEFAULT_MAX_EXPORT_ROWS = 25_000;

/**
 * Guard expensive in-memory exports before they load XLSX/ZIP or build a
 * complete JSON response. Operators can lower/raise the ceiling explicitly
 * with EXPORT_MAX_ROWS; the safe default prevents accidental unbounded work.
 */
export function maxExportRows(): number {
  const configured = Number(process.env.EXPORT_MAX_ROWS ?? DEFAULT_MAX_EXPORT_ROWS);
  return Number.isInteger(configured) && configured > 0 ? configured : DEFAULT_MAX_EXPORT_ROWS;
}

export function exportLimitMessage(kind: string, rows: number): string {
  return `${kind} contains ${rows.toLocaleString()} rows, above the ${maxExportRows().toLocaleString()}-row safety limit. Narrow the date range and try again.`;
}
