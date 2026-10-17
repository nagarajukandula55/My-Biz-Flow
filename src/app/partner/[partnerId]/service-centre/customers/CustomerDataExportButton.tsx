"use client";

import type { Column, Row } from "@/components/DataTable";
import { useState } from "react";
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

/** The optional server loader rechecks the OTP unlock when export is clicked. */
export function CustomerDataExportButton({ columns, rows = [], loadRows }: { columns: Column[]; rows?: Row[]; loadRows?: () => Promise<Row[]> }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  async function handleExport() {
    setLoading(true);
    setError(false);
    try {
    const exportRows = loadRows ? await loadRows() : rows;
    const header = columns.map((c) => toCsvValue(c.label)).join(",");
    const lines = exportRows.map((row) => columns.map((c) => toCsvValue(formatExportCell(c, row))).join(","));
    const csv = [header, ...lines].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
    <button type="button" disabled={loading} onClick={handleExport} className="btn-outline">
      Export CSV
    </button>
    {error && <span role="alert" className="text-xs text-text-muted">Export unavailable. Refresh and unlock customer data again.</span>}
    </div>
  );
}
