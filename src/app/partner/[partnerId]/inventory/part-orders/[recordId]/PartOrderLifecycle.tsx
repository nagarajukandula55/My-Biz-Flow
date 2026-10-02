"use client";

import { useState, useTransition } from "react";
import { StatusChip } from "@/components/StatusChip";
import { Modal } from "@/components/Modal";
import { dispatchPartOrderAction, receivePartOrderAction } from "../actions";
import { partOrderStatusLabel } from "@/lib/sample-data/warehouse";

const STATUS_VARIANT: Record<string, "warning" | "teal" | "success"> = {
  Pending: "warning",
  Dispatched: "teal",
  Delivered: "success",
};

/**
 * Explicit stage-lifecycle block for a Part Order — Waiting for Parts
 * (Pending) -> Dispatched (the only point real Stock leaves the source
 * warehouse; a Serialized material's barcodes are captured right here) ->
 * Delivered (terminal — posts the money ledger entry). Status is never a
 * form field any more; it only moves through these two explicit actions,
 * same pattern ReturnOrderLifecycle uses.
 */
export function PartOrderLifecycle({
  partnerId,
  recordId,
  status,
  serialized,
}: {
  partnerId: string;
  recordId: string;
  status: string;
  /** Whether the order's material is Serialized in BOM — shows the barcode textarea at Dispatch only when true. */
  serialized: boolean;
}) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [serials, setSerials] = useState("");

  function handleDispatch() {
    setError(null);
    startTransition(async () => {
      const result = await dispatchPartOrderAction(partnerId, recordId, serials);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setCurrentStatus("Dispatched");
      setDispatchOpen(false);
    });
  }

  function handleReceive() {
    setError(null);
    startTransition(async () => {
      const result = await receivePartOrderAction(partnerId, recordId);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setCurrentStatus("Delivered");
    });
  }

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Current Stage</p>
          <div className="mt-1">
            <StatusChip label={partOrderStatusLabel(currentStatus)} variant={STATUS_VARIANT[currentStatus] ?? "neutral"} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {currentStatus === "Pending" && (
            <button type="button" className="btn-accent" disabled={isPending} onClick={() => setDispatchOpen(true)}>
              Dispatch
            </button>
          )}
          {currentStatus === "Dispatched" && (
            <button type="button" className="btn-accent" disabled={isPending} onClick={handleReceive}>
              Mark Delivered (Received)
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <Modal
        open={dispatchOpen}
        onClose={() => setDispatchOpen(false)}
        title="Dispatch Part Order"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setDispatchOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-accent" disabled={isPending} onClick={handleDispatch}>
              Confirm Dispatch
            </button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <p className="text-text-muted">This deducts the material from the source warehouse&apos;s real Stock.</p>
          {serialized && (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                Serial / Barcode Numbers
              </label>
              <textarea
                value={serials}
                onChange={(e) => setSerials(e.target.value)}
                placeholder="One serial/barcode per line — count must match Quantity exactly."
                rows={4}
                className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
