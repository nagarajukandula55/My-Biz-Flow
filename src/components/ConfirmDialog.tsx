"use client";

import { useState } from "react";
import { Modal } from "./Modal";

type ConfirmDialogProps = {
  /** What the trigger button says, e.g. "Close Workorder", "Dispatch". */
  triggerLabel: string;
  triggerClassName?: string;
  /** Modal title, e.g. "Close this workorder?" */
  title: string;
  /** Body copy — describe the consequence, not just repeat the title. */
  description: string;
  confirmLabel?: string;
  confirmClassName?: string;
  onConfirm: () => void;
  /** Shown next to the trigger after confirming (demo stub pattern). */
  confirmedMessage?: string;
};

/**
 * Generic "are you sure" modal for any consequential action beyond delete
 * (see ConfirmDeleteDialog for that specific case) — closing a workorder,
 * dispatching a part order, cancelling a job sheet, etc. Built on Modal.tsx.
 */
export function ConfirmDialog({
  triggerLabel,
  triggerClassName = "btn-outline",
  title,
  description,
  confirmLabel = "Confirm",
  confirmClassName = "btn-accent",
  onConfirm,
  confirmedMessage,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  function handleConfirm() {
    onConfirm();
    setOpen(false);
    if (confirmedMessage) setConfirmed(true);
  }

  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => setOpen(true)}>
        {triggerLabel}
      </button>

      {confirmed && confirmedMessage && (
        <span className="ml-3 text-sm font-semibold text-success">{confirmedMessage}</span>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className={confirmClassName} onClick={handleConfirm}>
              {confirmLabel}
            </button>
          </>
        }
      >
        <p className="text-sm text-text-muted">{description}</p>
      </Modal>
    </>
  );
}
