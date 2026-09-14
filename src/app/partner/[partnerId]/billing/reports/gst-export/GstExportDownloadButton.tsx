"use client";

import { useState } from "react";
import { downloadGstExportAction, type GstFilter } from "@/lib/gstExportActions";

/**
 * Triggers the CSV Server Action and turns its string result into a
 * download — the standard Next.js "Server Action returns text, client
 * does the Blob + <a download>" pattern. No new API route, no client
 * fetch to a new endpoint: the download IS the Server Action's return
 * value, handled here.
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
      const { csv, filename, count } = await downloadGstExportAction(partnerId, from, to, filter);
      if (count === 0) {
        setMessage("No invoices match this date range / filter.");
        return;
      }
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
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
        {busy ? "Preparing…" : "Download CSV"}
      </button>
      {message && <span className="text-sm text-text-muted">{message}</span>}
    </div>
  );
}
