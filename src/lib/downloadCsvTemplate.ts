"use client";

function toCsvValue(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/** Same Blob + object-URL download used by CustomerDataExportButton, reused
 * here for bulk-upload "template" downloads (header row + one sample row)
 * so every CSV import feature shares one download mechanism. */
export function downloadCsvTemplate(filename: string, header: string[], sampleRow?: (string | number | boolean)[]) {
  const lines = [header.map(toCsvValue).join(",")];
  if (sampleRow) lines.push(sampleRow.map(toCsvValue).join(","));
  const csv = lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
