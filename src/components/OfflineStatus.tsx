"use client";

import { useEffect, useState } from "react";
import { readOfflineDrafts } from "@/lib/offlineQueue";

/** Honest shell status: connectivity and queued drafts only; never displays cached tenant data. */
export function OfflineStatus() {
  const [online, setOnline] = useState(true);
  const [queued, setQueued] = useState(0);
  useEffect(() => {
    const refresh = () => { setOnline(navigator.onLine); setQueued(readOfflineDrafts().length); };
    refresh();
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("mbf-offline-drafts-changed", refresh);
    return () => { window.removeEventListener("online", refresh); window.removeEventListener("offline", refresh); window.removeEventListener("storage", refresh); window.removeEventListener("mbf-offline-drafts-changed", refresh); };
  }, []);
  if (online && queued === 0) return null;
  return <div className="border-b border-border bg-bg-raised px-6 py-2 text-xs text-text-muted" role="status">{online ? `Online · ${queued} draft${queued === 1 ? "" : "s"} waiting to sync` : `Offline · ${queued} draft${queued === 1 ? "" : "s"} saved on this device`}</div>;
}
