"use client";

import type { Column, Row } from "@/components/DataTable";
import { formatDateForExport } from "@/lib/format";

function toCsvValue(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/** Formats a cell for export: date/datetime columns go through
 * formatDateForExport() for a clean, spreadsheet-safe `YYYY-MM-DD` (or
 * `YYYY-MM-DD HH:mm`) value instead of whatever raw string the field holds
 * — see RecordCsvExportButton's formatExportCell() for the same pattern. */
function formatExportCell(c: Column, row: Row): unknown {
  const value = row[c.key];
  if (value != null && value !== "") {
    if (c.type === "date") return formatDateForExport(String(value));
    if (c.type === "datetime") return formatDateForExport(String(value), true);
  }
  return value;
}

/** Client-side CSV export — only ever rendered when the OTP gate has already unlocked this page (see page.tsx), so no separate server check is needed to build the file, but the underlying data itself was only fetched server-side after the same unlock check. */
export function CustomerDataExportButton({ columns, rows }: { columns: Column[]; rows: Row[] }) {
  function handleExport() {
    const header = columns.map((c) => toCsvValue(c.label)).join(",");
    const lines = rows.map((row) => columns.map((c) => toCsvValue(formatExportCell(c, row))).join(","));
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" onClick={handleExport} className="btn-outline">
      Export CSV
    </button>
  );
}
