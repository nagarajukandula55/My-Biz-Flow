"use client";

import { useState, useTransition } from "react";
import { StatusChip } from "@/components/StatusChip";
import { Modal } from "@/components/Modal";
import {
  markReturnOrderInTransitAction,
  warehouseInwardReturnOrderAction,
  dispatchReturnOrderAction,
  rejectReturnOrderAction,
} from "../actions";
import { RETURN_STATUS_VARIANT } from "@/lib/sample-data/warehouse";
import type { TimelineEntry } from "@/components/RecordDetail";

/**
 * Explicit stage-lifecycle block for a Return Order, mirroring
 * WorkorderLifecycle.tsx's "current stage + next-action buttons + timeline"
 * pattern — scaled down to this record's much simpler stage sequence:
 *
 *   Inbound (Service Centre -> Warehouse): Created (Pending) -> In Transit
 *     -> Received (terminal, stock added) — or -> Rejected as an alternate
 *     branch from either Created or In Transit.
 *   Outbound (Warehouse -> Vendor/OEM): Created (Pending) -> Dispatched
 *     (terminal, stock deducted) — or -> Rejected as an alternate branch.
 *
 * "Created" is only a UI label for the stored "Pending" status — see
 * RETURN_ORDER_INITIAL_STATUS's doc comment in warehouse.ts. Every button
 * here calls one of the explicit server actions in actions.ts, which is the
 * only place status ever changes from now on (never a form field).
 */
export function ReturnOrderLifecycle({
  partnerId,
  recordId,
  direction,
  status,
  timeline,
}: {
  partnerId: string;
  recordId: string;
  direction: string;
  status: string;
  timeline: TimelineEntry[];
}) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  const displayStage = currentStatus === "Pending" ? "Created" : currentStatus;
  const variant = RETURN_STATUS_VARIANT[currentStatus] ?? "neutral";

  function run(action: () => Promise<void | { error?: string }>, nextStatus: string) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setCurrentStatus(nextStatus);
    });
  }

  const canMarkInTransit = direction === "Inbound" && currentStatus === "Pending";
  const canInward = direction === "Inbound" && (currentStatus === "Pending" || currentStatus === "In Transit");
  const canDispatch = direction === "Outbound" && currentStatus === "Pending";
  const canReject = currentStatus === "Pending" || currentStatus === "In Transit";

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Current Stage</p>
          <div className="mt-1">
            <StatusChip label={displayStage} variant={variant} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canMarkInTransit && (
            <button
              type="button"
              className="btn-outline"
              disabled={isPending}
              onClick={() => run(() => markReturnOrderInTransitAction(partnerId, recordId), "In Transit")}
            >
              Mark In Transit
            </button>
          )}
          {canInward && (
            <button
              type="button"
              className="btn-accent"
              disabled={isPending}
              onClick={() => run(() => warehouseInwardReturnOrderAction(partnerId, recordId), "Received")}
            >
              Warehouse Inward (Receive)
            </button>
          )}
          {canDispatch && (
            <button
              type="button"
              className="btn-accent"
              disabled={isPending}
              onClick={() => run(() => dispatchReturnOrderAction(partnerId, recordId), "Dispatched")}
            >
              Dispatch
            </button>
          )}
          {canReject && (
            <button type="button" className="text-xs text-danger hover:underline" disabled={isPending} onClick={() => setRejectOpen(true)}>
              Reject
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {timeline.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Stage History</p>
          <ul className="mt-3 space-y-3">
            {timeline.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                <div>
                  <p className="text-text">{entry.label}</p>
                  <p className="text-xs text-text-muted">
                    {new Date(entry.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {entry.actor ? ` — ${entry.actor}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject Return Order"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setRejectOpen(false)}>
              Keep it
            </button>
            <button
              type="button"
              className="btn-accent"
              disabled={isPending}
              onClick={() => {
                run(() => rejectReturnOrderAction(partnerId, recordId), "Rejected");
                setRejectOpen(false);
              }}
            >
              Reject Return Order
            </button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          Marks this Return Order Rejected — a terminal, closed-out state. No stock effect applies, since nothing was
          ever accepted.
        </p>
      </Modal>
    </div>
  );
}
