"use client";

import { useState, useTransition } from "react";
import { cancelStockTakeAction } from "../actions";

/**
 * Cancels a Pending Stock Take, releasing any reservation its variance lines
 * hold — no OTP needed (unlike Reconcile) since cancelling never touches
 * real Stock/StockLots/the ledger, only discards the pending count and frees
 * the reservation it was holding.
 */
export function StockTakeCancelButton({ partnerId, recordId }: { partnerId: string; recordId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    if (!window.confirm("Cancel this Stock Take? The count will be discarded and any reserved stock released.")) return;
    setError(null);
    startTransition(async () => {
      const res = await cancelStockTakeAction(partnerId, recordId);
      if (res.error) {
        setError(res.error);
        return;
      }
      window.location.reload();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={handleCancel} disabled={isPending} className="btn-outline disabled:opacity-50">
        Cancel Stock Take
      </button>
      {error && <div className="text-xs text-danger">{error}</div>}
    </div>
  );
}
