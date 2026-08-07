"use client";

import { useState } from "react";

type ConfirmDeleteDialogProps = {
  recordLabel: string;
  onConfirm?: () => void;
  triggerClassName?: string;
  triggerLabel?: string;
};

/**
 * Reusable delete-confirmation modal. Shared by every module's detail page
 * (and optionally list rows) — see DESIGN_SYSTEM.md §8 (ConfirmDeleteDialog
 * convention). No backend is wired up in this pass, so confirming just logs
 * and closes the dialog.
 */
export function ConfirmDeleteDialog({
  recordLabel,
  onConfirm,
  triggerClassName = "btn-danger",
  triggerLabel = "Delete",
}: ConfirmDeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);

  function handleConfirm() {
    // eslint-disable-next-line no-console
    console.log("Delete confirmed (demo, no backend):", recordLabel);
    onConfirm?.();
    setOpen(false);
    setDeleted(true);
  }

  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => setOpen(true)}>
        {triggerLabel}
      </button>

      {deleted && (
        <span className="ml-3 text-sm font-semibold text-success">
          Deleted (demo — no backend yet)
        </span>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-lg border border-border bg-bg-raised p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold text-text">Delete record</h3>
            <p className="mt-2 text-sm text-text-muted">
              Are you sure you want to delete <span className="font-semibold text-text">{recordLabel}</span>?
              This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className="btn-outline" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn-danger" onClick={handleConfirm}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
