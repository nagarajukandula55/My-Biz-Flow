"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { resetDemoData } from "./actions";

/**
 * Danger-zone action for the live demo: wipes every Prisma-backed store
 * back to a clean state (see actions.ts for exactly what that covers).
 * Business records aren't persisted yet, so this is currently the whole
 * "clear all vendor data" story — extend actions.ts as more moves to
 * Prisma.
 */
export function ResetDemoDataButton() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handleConfirm() {
    startTransition(async () => {
      await resetDemoData();
      setOpen(false);
      setDone(true);
    });
  }

  return (
    <>
      <button type="button" className="btn-danger" onClick={() => setOpen(true)}>
        Reset Demo Data
      </button>
      {done && <span className="ml-3 text-sm font-semibold text-success">Demo data reset.</span>}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Reset Demo Data"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </button>
            <button type="button" className="btn-danger" onClick={handleConfirm} disabled={pending}>
              {pending ? "Resetting…" : "Reset Everything"}
            </button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          This permanently deletes every Designer customization, document template, module appearance
          override, numbering scheme/counter, page-access toggle, and error log entry for every vendor —
          resetting the whole demo back to defaults. This cannot be undone.
        </p>
      </Modal>
    </>
  );
}
