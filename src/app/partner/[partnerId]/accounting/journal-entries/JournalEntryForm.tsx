"use client";

import { useState, useTransition } from "react";
import { JournalLinesEditor, type JournalLineRow, type JournalAccountOption } from "../JournalLinesEditor";

export type JournalEntryFormAction = (
  values: Record<string, unknown>,
  lines: JournalLineRow[]
) => Promise<{ error?: string } | void>;

export function JournalEntryForm({
  accountOptions,
  initialValues,
  initialLines,
  submitLabel,
  action,
}: {
  accountOptions: JournalAccountOption[];
  initialValues?: { entryDate?: string; narration?: string };
  initialLines?: JournalLineRow[];
  submitLabel: string;
  action: JournalEntryFormAction;
}) {
  const [entryDate, setEntryDate] = useState(initialValues?.entryDate ?? new Date().toISOString().slice(0, 10));
  const [narration, setNarration] = useState(initialValues?.narration ?? "");
  const [lines, setLines] = useState<JournalLineRow[]>(initialLines ?? []);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await action({ entryDate, narration }, lines);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">Entry Date</span>
          <input
            type="date"
            required
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">Narration</span>
          <input
            type="text"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder="Optional description"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
          />
        </label>
      </div>

      <div className="mt-6">
        <JournalLinesEditor lines={lines} onChange={setLines} accountOptions={accountOptions} />
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <div className="mt-6">
        <button type="submit" disabled={pending} className="btn-accent">
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
