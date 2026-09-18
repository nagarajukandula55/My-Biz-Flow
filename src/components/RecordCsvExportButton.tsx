"use client";

import { useState } from "react";
import type { Row } from "@/components/DataTable";

function toCsvValue(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/**
 * Generic "Download CSV" button for a list already loaded client-side —
 * no Server Action needed (unlike GstExportDownloadButton, which recomputes
 * a report server-side): the rows are already on the page, so this just
 * serializes them. Same Blob + `<a download>` mechanism every other export
 * button in this app uses.
 */
export function RecordCsvExportButton({ columns, rows, filename }: { columns: string[]; rows: Row[]; filename: string }) {
  const [message, setMessage] = useState<string | null>(null);

  function handleDownload() {
    if (rows.length === 0) {
      setMessage("Nothing to export.");
      return;
    }
    const lines = [columns.map(toCsvValue).join(",")];
    for (const row of rows) {
      lines.push(columns.map((c) => toCsvValue(row[c])).join(","));
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
