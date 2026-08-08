"use client";

import { useState } from "react";
import { Modal } from "./Modal";

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
 * and closes the dialog. Built on Modal.tsx — see ConfirmDialog.tsx for the
 * generic (non-delete) version of this same pattern.
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete record"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-danger" onClick={handleConfirm}>
              Delete
            </button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          Are you sure you want to delete <span className="font-semibold text-text">{recordLabel}</span>?
          This action cannot be undone.
        </p>
      </Modal>
    </>
  );
}
