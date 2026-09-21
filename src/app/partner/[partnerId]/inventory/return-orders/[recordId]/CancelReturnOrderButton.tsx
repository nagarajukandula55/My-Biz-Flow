"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { cancelReturnOrderAction } from "../actions";

export function CancelReturnOrderButton({ partnerId, recordId }: { partnerId: string; recordId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmCancel() {
    startTransition(async () => {
      const result = await cancelReturnOrderAction(partnerId, recordId);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <>
      <button type="button" className="text-xs text-danger hover:underline" onClick={() => setOpen(true)}>
        Cancel Return Order
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Cancel Return Order"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setOpen(false)}>
              Keep it
            </button>
            <button type="button" className="btn-accent" onClick={confirmCancel} disabled={isPending}>
              {isPending ? "Cancelling…" : "Cancel Return Order"}
            </button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          Only allowed while still Pending/In Transit — nothing has moved stock yet, so this just marks the record
          Cancelled with no other effect.
        </p>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </Modal>
    </>
  );
}
