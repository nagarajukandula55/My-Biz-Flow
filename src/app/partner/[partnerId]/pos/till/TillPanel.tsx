"use client";

import { useState, useTransition } from "react";
import { openTillSessionAction, closeTillSessionAction } from "./actions";

type OpenSession = { id: string; openingFloat: number; openedAt: string; openedByName: string };

export function TillPanel({
  partnerId,
  locationId,
  openSession,
}: {
  partnerId: string;
  locationId: string;
  openSession: OpenSession | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [openingFloat, setOpeningFloat] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    setError(null);
    const formData = new FormData();
    formData.set("locationId", locationId);
    formData.set("openingFloat", openingFloat || "0");
    startTransition(async () => {
      const result = await openTillSessionAction(partnerId, formData);
      if (result?.error) setError(result.error);
      else setOpeningFloat("");
    });
  }

  function handleClose() {
    if (!openSession) return;
    setError(null);
    const formData = new FormData();
    formData.set("sessionId", openSession.id);
    formData.set("countedCash", countedCash || "0");
    formData.set("notes", notes);
    startTransition(async () => {
      const result = await closeTillSessionAction(partnerId, formData);
      if (result?.error) setError(result.error);
      else {
        setCountedCash("");
        setNotes("");
      }
    });
  }

  if (openSession) {
    return (
      <div className="rounded-md border border-border bg-bg-raised p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-text">Till Open</h2>
          <span className="text-xs text-text-muted">
            Opened by {openSession.openedByName} — {new Date(openSession.openedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
          </span>
        </div>
        <p className="mt-1 text-sm text-text-muted">Opening float: ₹{openSession.openingFloat.toLocaleString("en-IN")}</p>

        <div className="mt-4 space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
            Counted Cash (physical count at close)
            <input
              type="number"
              min={0}
              value={countedCash}
              onChange={(e) => setCountedCash(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
            Notes (optional)
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="button" onClick={handleClose} disabled={isPending} className="btn-accent w-full">
            {isPending ? "Closing…" : "Close Till"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-bg-raised p-4">
      <h2 className="font-display text-base font-bold text-text">Open Till</h2>
      <p className="mt-1 text-sm text-text-muted">Count and enter the starting cash float before selling.</p>

      <div className="mt-4 space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
          Opening Cash Float
          <input
            type="number"
            min={0}
            value={openingFloat}
            onChange={(e) => setOpeningFloat(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
          />
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="button" onClick={handleOpen} disabled={isPending} className="btn-accent w-full">
          {isPending ? "Opening…" : "Open Till"}
        </button>
      </div>
    </div>
  );
}
