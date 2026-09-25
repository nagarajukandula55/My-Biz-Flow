"use client";

import { useState, useTransition } from "react";
import { formatDate } from "@/lib/format";
import type { LegalCourtDateRecord } from "@/lib/legal";
import { addLegalCourtDateAction } from "./actions";

export function CourtDatesSection({
  partnerId,
  matterId,
  initialCourtDates,
}: {
  partnerId: string;
  matterId: string;
  initialCourtDates: LegalCourtDateRecord[];
}) {
  const [courtDates, setCourtDates] = useState(initialCourtDates);
  const [formOpen, setFormOpen] = useState(false);
  const [hearingDate, setHearingDate] = useState(new Date().toISOString().slice(0, 10));
  const [court, setCourt] = useState("");
  const [purpose, setPurpose] = useState("");
  const [outcome, setOutcome] = useState("");
  const [, startTransition] = useTransition();

  function submit() {
    if (!hearingDate) return;
    const optimistic: LegalCourtDateRecord = {
      id: `pending-${Date.now()}`,
      matterId,
      hearingDate,
      court: court || null,
      purpose: purpose || null,
      outcome: outcome || null,
    };
    setCourtDates((prev) => [...prev, optimistic].sort((a, b) => a.hearingDate.localeCompare(b.hearingDate)));
    setFormOpen(false);
    const input = { hearingDate, court: court || undefined, purpose: purpose || undefined, outcome: outcome || undefined };
    setCourt("");
    setPurpose("");
    setOutcome("");
    startTransition(async () => {
      await addLegalCourtDateAction(partnerId, matterId, input);
    });
  }

  return (
    <div className="rounded-md border border-border bg-bg-raised p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-text">Court Dates</h2>
        <button type="button" className="btn-outline" onClick={() => setFormOpen((v) => !v)}>
          + Add Court Date
        </button>
      </div>

      {courtDates.length === 0 && !formOpen && (
        <p className="mt-3 text-sm text-text-muted">No court dates recorded yet.</p>
      )}

      {courtDates.length > 0 && (
        <div className="mt-3 space-y-2">
          {courtDates.map((cd) => (
            <div key={cd.id} className="rounded-md border border-border bg-bg px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-text">{formatDate(cd.hearingDate)}</span>
                {cd.court && <span className="text-xs text-text-muted">{cd.court}</span>}
              </div>
              {cd.purpose && <p className="mt-1 text-text-muted">Purpose: {cd.purpose}</p>}
              {cd.outcome && <p className="mt-1 text-text-muted">Outcome: {cd.outcome}</p>}
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <div className="mt-4 space-y-3 rounded-md border border-border bg-bg p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Hearing Date</label>
              <input
                type="date"
                value={hearingDate}
                onChange={(e) => setHearingDate(e.target.value)}
                className="w-full rounded-md border border-border bg-bg-raised px-3 py-2 text-sm text-text"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Court</label>
              <input
                type="text"
                value={court}
                onChange={(e) => setCourt(e.target.value)}
                className="w-full rounded-md border border-border bg-bg-raised px-3 py-2 text-sm text-text"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Purpose</label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full rounded-md border border-border bg-bg-raised px-3 py-2 text-sm text-text"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Outcome</label>
            <input
              type="text"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="w-full rounded-md border border-border bg-bg-raised px-3 py-2 text-sm text-text"
            />
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="btn-accent" onClick={submit}>
              Save Court Date
            </button>
            <button type="button" className="btn-outline" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
