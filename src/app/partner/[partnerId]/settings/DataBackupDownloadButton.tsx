"use client";

import { useState } from "react";
import { downloadDataBackupAction } from "@/lib/dataBackupActions";

/**
 * Same Server-Action-returns-text / client-does-the-Blob pattern as
 * GstExportDownloadButton (src/app/partner/[partnerId]/billing/reports/gst-export) —
 * downloads a JSON file with every BusinessRecord this partner owns, across
 * every module, for the partner's own peace of mind. Not a sync to any
 * other system.
 */
export function DataBackupDownloadButton({ partnerId }: { partnerId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleDownload() {
    setBusy(true);
    setMessage(null);
    try {
      const { json, filename, recordCount } = await downloadDataBackupAction(partnerId);
      const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage(`Downloaded ${recordCount} record${recordCount === 1 ? "" : "s"} across all modules.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not generate the export.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={handleDownload} disabled={busy} className="btn-accent disabled:opacity-60">
        {busy ? "Preparing…" : "Download my data (JSON)"}
      </button>
      {message && <span className="text-sm text-text-muted">{message}</span>}
    </div>
  );
}
