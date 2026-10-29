export type OfflineDraft = { id: string; kind: string; payload: Record<string, unknown>; createdAt: string };
const KEY = "mbf-offline-drafts";
export function queueOfflineDraft(kind: string, payload: Record<string, unknown>): OfflineDraft | null { if (typeof window === "undefined") return null; const draft = { id: crypto.randomUUID(), kind, payload, createdAt: new Date().toISOString() }; localStorage.setItem(KEY, JSON.stringify([...readOfflineDrafts(), draft])); return draft; }
export function readOfflineDrafts(): OfflineDraft[] { if (typeof window === "undefined") return []; try { const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]"); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
export function removeOfflineDraft(id: string): void { if (typeof window === "undefined") return; localStorage.setItem(KEY, JSON.stringify(readOfflineDrafts().filter(d => d.id !== id))); }

export async function replayOfflineDrafts(handler: (draft: OfflineDraft) => Promise<boolean>): Promise<{ completed: string[]; retained: string[] }> {
  const completed: string[] = [], retained: string[] = [];
  for (const draft of readOfflineDrafts()) {
    try {
      if (await handler(draft)) { removeOfflineDraft(draft.id); completed.push(draft.id); }
      else retained.push(draft.id);
    } catch { retained.push(draft.id); }
  }
  return { completed, retained };
}
