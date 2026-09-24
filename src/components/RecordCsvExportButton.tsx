"use client";

import { useState } from "react";
import type { Row } from "@/components/DataTable";
import { formatDateForExport } from "@/lib/format";

function toCsvValue(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/**
 * A plain string column key, or a key paired with its type so date/datetime
 * fields get run through formatDateForExport() instead of being written raw
 * — a raw ISO timestamp is at least unambiguous, but formatting it
 * consistently here means no caller can accidentally hand this a
 * `Date`/`.toString()`/`.toLocaleString()` value and have it land in the
 * CSV as alphabetic junk (weekday/month names, "GMT+0530 (India Standard
 * Time)") instead of a clean date.
 */
type ExportColumn = string | { key: string; type?: "date" | "datetime" };

function columnKey(c: ExportColumn): string {
  return typeof c === "string" ? c : c.key;
}

function formatExportCell(c: ExportColumn, row: Row): unknown {
  const key = columnKey(c);
  const value = row[key];
  if (typeof c !== "string" && value != null && value !== "") {
    if (c.type === "date") return formatDateForExport(String(value));
    if (c.type === "datetime") return formatDateForExport(String(value), true);
  }
  return value;
}

/**
 * Generic "Download CSV" button for a list already loaded client-side —
 * no Server Action needed (unlike GstExportDownloadButton, which recomputes
 * a report server-side): the rows are already on the page, so this just
 * serializes them. Same Blob + `<a download>` mechanism every other export
 * button in this app uses.
 */
export function RecordCsvExportButton({ columns, rows, filename }: { columns: ExportColumn[]; rows: Row[]; filename: string }) {
  const [message, setMessage] = useState<string | null>(null);

  function handleDownload() {
    if (rows.length === 0) {
      setMessage("Nothing to export.");
      return;
    }
    const lines = [columns.map((c) => toCsvValue(columnKey(c))).join(",")];
    for (const row of rows) {
      lines.push(columns.map((c) => toCsvValue(formatExportCell(c, row))).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setMessage(null);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleDownload}
        className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-text hover:bg-bg-sunken"
      >
        Download CSV
      </button>
      {message && <span className="text-xs text-text-muted">{message}</span>}
    </div>
  );
}
