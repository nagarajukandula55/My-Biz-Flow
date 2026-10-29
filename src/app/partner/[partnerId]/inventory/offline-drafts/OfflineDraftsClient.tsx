"use client";
import { useEffect, useState } from "react";
import { readOfflineDrafts, removeOfflineDraft, type OfflineDraft } from "@/lib/offlineQueue";
import { replayOfflineDraftAction } from "./actions";

export function OfflineDraftsClient({ partnerId }: { partnerId: string }) {
  const [drafts, setDrafts] = useState<OfflineDraft[]>([]);
  const refresh = () => setDrafts(readOfflineDrafts());
  useEffect(() => { refresh(); window.addEventListener("mbf-offline-drafts-changed", refresh); return () => window.removeEventListener("mbf-offline-drafts-changed", refresh); }, []);
  return <div className="space-y-3">{drafts.map((draft) => <article key={draft.id} className="rounded border border-border bg-surface p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-medium text-text">{draft.kind}</div><div className="text-xs text-text-muted">Saved {new Date(draft.createdAt).toLocaleString()}</div></div><div className="flex gap-2">{["interior-site-update", "interior-selection"].includes(draft.kind) && <button className="btn-accent" type="button" onClick={async () => { try { await replayOfflineDraftAction(partnerId, draft); removeOfflineDraft(draft.id); refresh(); } catch (error) { window.alert(error instanceof Error ? error.message : "Draft could not be replayed."); } }}>Replay</button>}<button className="btn-outline" type="button" onClick={() => removeOfflineDraft(draft.id)}>Remove</button></div></div><pre className="mt-3 max-h-48 overflow-auto rounded bg-bg p-3 text-xs text-text-muted">{JSON.stringify(draft.payload, null, 2)}</pre></article>)}{drafts.length === 0 && <p className="text-sm text-text-muted">No offline drafts are saved on this device.</p>}</div>;
}
