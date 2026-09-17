"use client";

import type { Column, Row } from "@/components/DataTable";

function toCsvValue(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/** Client-side CSV export — only ever rendered when the OTP gate has already unlocked this page (see page.tsx), so no separate server check is needed to build the file, but the underlying data itself was only fetched server-side after the same unlock check. */
export function CustomerDataExportButton({ columns, rows }: { columns: Column[]; rows: Row[] }) {
  function handleExport() {
    const header = columns.map((c) => toCsvValue(c.label)).join(",");
    const lines = rows.map((row) => columns.map((c) => toCsvValue(row[c.key])).join(","));
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
