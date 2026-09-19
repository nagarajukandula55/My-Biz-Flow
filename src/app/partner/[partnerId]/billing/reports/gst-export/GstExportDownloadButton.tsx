"use client";

import { useState } from "react";
import type { GstFilter } from "@/lib/gstExport";

/**
 * Downloads the ZIP from /api/gst-export (a standalone Route Handler, not
 * a Server Action) — a plain `fetch` + Blob download. Deliberately NOT a
 * Server Action here: keeping this button's own module graph free of
 * `xlsx`/`jszip` matters because this component is imported by this
 * feature's page.tsx, which src/lib/designer/registerAll.ts side-effect-
 * imports for the Designer registry, which src/lib/rbac.ts imports, which
 * every /partner/[partnerId]/* page pulls in via PartnerLayout. Anything
 * heavy reachable from here would get traced into every partner route's
 * Serverless Function bundle, not just this one page — see
 * src/app/api/gst-export/route.ts's header comment for the full story.
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
      const params = new URLSearchParams({ partnerId, from, to, filter });
      const res = await fetch(`/api/gst-export?${params.toString()}`);
      const contentType = res.headers.get("Content-Type") ?? "";
      if (!res.ok || contentType.includes("application/json")) {
        const body = await res.json().catch(() => ({}));
        setMessage(body.error || "Could not generate the export.");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "gst-export.zip";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage("Downloaded.");
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
