"use client";

import { useState } from "react";

/**
 * Shares the currently rendered document without exposing record data to a
 * new endpoint. On supported devices this opens the native share sheet; on
 * desktop it copies the document URL. PDF export remains the browser's
 * print-to-PDF flow, so no private document is uploaded or cached.
 */
export function DocumentShareButton({ shareUrl }: { shareUrl?: string }) {
  const [status, setStatus] = useState<string | null>(null);

  async function share() {
    const url = shareUrl ? new URL(shareUrl, window.location.origin).toString() : window.location.href;
    const data = { title: document.title || "Document", text: "View this document", url };
    try {
      if (navigator.share) {
        await navigator.share(data);
        setStatus("Shared");
      } else {
        await navigator.clipboard.writeText(url);
        setStatus("Link copied");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("Could not share");
    }
    window.setTimeout(() => setStatus(null), 2500);
  }

  return (
    <button type="button" onClick={share} className="btn-outline print:hidden" aria-label="Share document">
      {status ?? "Share document"}
    </button>
  );
}
