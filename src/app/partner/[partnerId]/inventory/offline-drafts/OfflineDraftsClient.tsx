"use client";
import { useEffect, useState } from "react";
import { readOfflineDrafts, removeOfflineDraft, type OfflineDraft } from "@/lib/offlineQueue";
import { replayOfflineDraftAction } from "./actions";
import { syncOfflineRestaurantOrderAction } from "../../restaurant-pos/actions";
import { syncOfflineHotelReservationAction } from "../../hotel/actions";

export function OfflineDraftsClient({ partnerId }: { partnerId: string }) {
  const [drafts, setDrafts] = useState<OfflineDraft[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const refresh = () => setDrafts(readOfflineDrafts());
  useEffect(() => { refresh(); window.addEventListener("mbf-offline-drafts-changed", refresh); return () => window.removeEventListener("mbf-offline-drafts-changed", refresh); }, []);
  async function sync(draft: OfflineDraft) {
    setBusy(draft.id); setErrors(current => ({ ...current, [draft.id]: "" }));
    try {
      if (draft.kind === "restaurant-order") await syncOfflineRestaurantOrderAction(partnerId, draft);
      else if (draft.kind === "hotel-reservation") await syncOfflineHotelReservationAction(partnerId, draft);
      else await replayOfflineDraftAction(partnerId, draft);
      removeOfflineDraft(draft.id); refresh();
    } catch (error) { setErrors(current => ({ ...current, [draft.id]: error instanceof Error ? error.message : "Draft could not be synced." })); }
    finally { setBusy(null); }
  }
  return <div className="space-y-3">{drafts.map((draft) => { const syncable = ["interior-site-update", "interior-selection", "restaurant-order", "hotel-reservation"].includes(draft.kind); return <article key={draft.id} className="rounded border border-border bg-surface p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-medium text-text">{draft.kind}</div><div className="text-xs text-text-muted">Saved {new Date(draft.createdAt).toLocaleString()} · Stored on this device</div></div><div className="flex gap-2">{syncable && <button className="btn-accent" type="button" disabled={busy!==null} onClick={() => sync(draft)}>{busy===draft.id?"Syncing…":"Validate and sync"}</button>}<button className="btn-outline" type="button" disabled={busy!==null} onClick={() => { removeOfflineDraft(draft.id); refresh(); }}>Remove</button></div></div>{errors[draft.id]&&<p role="alert" className="mt-3 rounded bg-danger-soft p-2 text-sm text-danger">Not synced: {errors[draft.id]}</p>}<pre className="mt-3 max-h-48 overflow-auto rounded bg-bg p-3 text-xs text-text-muted">{JSON.stringify(draft.payload, null, 2)}</pre></article>; })}{drafts.length === 0 && <p className="text-sm text-text-muted">No offline drafts are saved in this browser profile.</p>}</div>;
}
