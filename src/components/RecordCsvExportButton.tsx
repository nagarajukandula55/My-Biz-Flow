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
 * Downloads existing rows, or calls an authorized server loader on demand.
 * Existing callers retain the same CSV serialization and download behavior.
 */
export function RecordCsvExportButton({ columns, rows = [], loadRows, filename, includeAllRowFields = true }: { columns: ExportColumn[]; rows?: Row[]; loadRows?: () => Promise<Row[]>; filename: string; includeAllRowFields?: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
    const exportRows = loadRows ? await loadRows() : rows;
    if (exportRows.length === 0) {
      setMessage("Nothing to export.");
      return;
    }
    // A report must not silently omit a saved form field just because a
    // page's table configuration has not been updated yet. Keep the page's
    // deliberate column order first, then append every remaining stored
    // field found in the export rows. A caller can still opt out for a
    // purpose-built aggregate report.
    const exportColumns: ExportColumn[] = [...columns];
    if (includeAllRowFields) {
      const included = new Set(exportColumns.map(columnKey));
      for (const row of exportRows) {
        for (const key of Object.keys(row)) {
          // `id` and `recordCreatedAt` are persistence metadata injected by
          // the generic record store, not partner-entered form fields. A
          // page that deliberately needs either can still list it explicitly.
          if (key === "id" || key === "recordCreatedAt") continue;
          if (!included.has(key)) {
            exportColumns.push(key);
            included.add(key);
          }
        }
      }
    }
    const lines = [exportColumns.map((c) => toCsvValue(columnKey(c))).join(",")];
    for (const row of exportRows) {
      lines.push(exportColumns.map((c) => toCsvValue(formatExportCell(c, row))).join(","));
    }
    // Leading BOM so Excel on Windows reads this as UTF-8 instead of
    // defaulting to the system ANSI codepage (which turns "—" into "â€”").
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setMessage(null);
    } catch {
      setMessage("Export unavailable. Refresh the page and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-text hover:bg-bg-sunken"
      >
        Download CSV
      </button>
      {message && <span className="text-xs text-text-muted">{message}</span>}
    </div>
  );
}
