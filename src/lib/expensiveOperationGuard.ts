/**
 * Best-effort per-instance guard for expensive report/export work.
 * It is deliberately small and memory-only: it adds no database writes and
 * never replaces authentication or authorization. A repeated click on the
 * same export is rejected while the current operation is running and for a
 * short cooldown afterwards.
 */
type Entry = { running: boolean; lastFinishedAt: number };
const globalState = globalThis as typeof globalThis & { __mbfExpensiveOps?: Map<string, Entry> };
const entries = globalState.__mbfExpensiveOps ?? (globalState.__mbfExpensiveOps = new Map());
const COOLDOWN_MS = 15_000;

export function beginExpensiveOperation(key: string): (() => void) | null {
  const now = Date.now();
  const current = entries.get(key);
  if (current?.running || (current?.lastFinishedAt && now - current.lastFinishedAt < COOLDOWN_MS)) return null;
  entries.set(key, { running: true, lastFinishedAt: current?.lastFinishedAt ?? 0 });
  return () => {
    entries.set(key, { running: false, lastFinishedAt: Date.now() });
    for (const [entryKey, entry] of entries) if (!entry.running && Date.now() - entry.lastFinishedAt > COOLDOWN_MS * 4) entries.delete(entryKey);
  };
}
