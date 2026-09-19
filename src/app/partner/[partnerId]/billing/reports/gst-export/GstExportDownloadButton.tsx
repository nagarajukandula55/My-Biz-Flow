"use client";

import { useState } from "react";
import { downloadGstExportZipAction, type GstFilter } from "@/lib/gstExportActions";

function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

/**
 * Triggers the ZIP-building Server Action and turns its base64 result into
 * a download — the standard Next.js "Server Action returns data, client
 * does the Blob + <a download>" pattern. No new API route, no client
 * fetch to a new endpoint. The ZIP contains gst-export.json (every GST-
 * required field per invoice) and gst-export.xlsx (the same rows as a
 * spreadsheet) — see gstExport.ts/gstExportActions.ts.
 */
export function GstExportDownloadButton({
  partnerId,
  from,
  to,
  filter,
}: {
  partnerId: string;
  from: string;
  to: string;
  filter: GstFilter;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleDownload() {
    setBusy(true);
    setMessage(null);
    try {
      const { zipBase64, filename, count } = await downloadGstExportZipAction(partnerId, from, to, filter);
      if (count === 0) {
        setMessage("No invoices match this date range / filter.");
        return;
      }
      const blob = base64ToBlob(zipBase64, "application/zip");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage(`Downloaded ${count} invoice${count === 1 ? "" : "s"}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not generate the export.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={handleDownload} disabled={busy} className="btn-accent disabled:opacity-60">
        {busy ? "Preparing…" : "Download GST Export (ZIP)"}
      </button>
      {message && <span className="text-sm text-text-muted">{message}</span>}
    </div>
  );
}
