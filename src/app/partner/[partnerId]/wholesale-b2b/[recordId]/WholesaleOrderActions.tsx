"use client";

import { useState, useTransition } from "react";
import { StatusChip } from "@/components/StatusChip";
import { createWholesaleDispatchAction, updateWholesaleOrderStatusAction } from "../actions";

const NEXT_STATUS: Record<string, string | null> = {
  Pending: "Confirmed",
  Confirmed: "Dispatched",
  Dispatched: "Delivered",
  Delivered: null,
  Cancelled: null,
};

/**
 * Order lifecycle panel on the wholesale-b2b order detail page: shows the
 * line items, base vs. tier-discounted total, the customer's live
 * outstanding balance against their credit limit, and status-advance /
 * cancel buttons enforcing the fixed Pending -> Confirmed -> Dispatched ->
 * Delivered (or Cancelled from any non-final state) transition set — see
 * isAllowedStatusTransition in src/lib/wholesaleData.ts.
 */
export function WholesaleOrderActions({
  partnerId,
  orderId,
  status,
  priceTierName,
  discountPercent,
  totalAmount,
  creditLimit,
  outstandingBalance,
  lines,
  dispatch,
}: {
  partnerId: string;
  orderId: string;
  status: string;
  priceTierName: string | null;
  discountPercent: number;
  totalAmount: number; // rupees
  creditLimit: number; // rupees
  outstandingBalance: number; // rupees
  lines: Array<{ id: string; materialLabel: string; quantity: number; unitPrice: number }>; // unitPrice in rupees (base)
  dispatch?: { carrier: string; trackingNumber: string; dispatchedAt: string; notes?: string } | null;
}) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const nextStatus = NEXT_STATUS[currentStatus];
  const overLimit = creditLimit > 0 && outstandingBalance > creditLimit;

  function advance(target: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateWholesaleOrderStatusAction(partnerId, orderId, target);
      if (result?.error) {
        setError(result.error);
      } else {
        setCurrentStatus(target);
      }
    });
  }

  return (
    <div className="rounded-md border border-border bg-bg-raised p-4">
      <h2 className="font-display text-base font-bold text-text">Line Items & Pricing</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
              <th className="px-2 py-2">Item</th>
              <th className="px-2 py-2 text-right">Qty</th>
              <th className="px-2 py-2 text-right">Base Unit Price</th>
              <th className="px-2 py-2 text-right">Discounted Unit Price</th>
              <th className="px-2 py-2 text-right">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const discountedUnit = Math.round(l.unitPrice * (1 - discountPercent / 100) * 100) / 100;
              return (
                <tr key={l.id} className="border-b border-border last:border-b-0">
                  <td className="px-2 py-2 text-text">{l.materialLabel}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-text">{l.quantity}</td>
                  <td className={`px-2 py-2 text-right tabular-nums ${discountPercent > 0 ? "text-text-muted line-through" : "text-text"}`}>
                    ₹{l.unitPrice.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-text">
                    {discountPercent > 0 ? `₹${discountedUnit.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-2 py-2 text-right font-semibold tabular-nums text-text">
                    ₹{(discountedUnit * l.quantity).toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Price Tier</div>
          <div className="mt-0.5 text-sm text-text">{priceTierName ?? "None — list price"}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Order Total (discounted)</div>
          <div className="mt-0.5 text-sm font-semibold text-text">₹{totalAmount.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Status</div>
          <div className="mt-0.5">
            <StatusChip label={currentStatus} variant={currentStatus === "Cancelled" ? "danger" : currentStatus === "Delivered" ? "success" : "neutral"} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusChip
          label={`Customer outstanding: ₹${outstandingBalance.toFixed(2)} / ₹${creditLimit.toFixed(2)} limit`}
          variant={overLimit ? "danger" : "neutral"}
        />
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        {nextStatus && (
          <button type="button" className="btn-accent" disabled={pending} onClick={() => advance(nextStatus)}>
            Mark as {nextStatus}
          </button>
        )}
        {currentStatus !== "Delivered" && currentStatus !== "Cancelled" && (
          <button type="button" className="btn-outline" disabled={pending} onClick={() => advance("Cancelled")}>
            Cancel Order
          </button>
        )}
      </div>
      {(currentStatus === "Dispatched" || currentStatus === "Delivered") && (
        <div className="mt-6 border-t border-border pt-4">
          <h3 className="font-display text-sm font-bold text-text">Dispatch & Tracking</h3>
          {dispatch ? (
            <p className="mt-2 text-sm text-text">{dispatch.carrier} · {dispatch.trackingNumber} · {new Date(dispatch.dispatchedAt).toLocaleDateString()}</p>
          ) : (
            <form className="mt-3 grid gap-3 sm:grid-cols-2" action={(formData) => {
              setDispatchError(null);
              startTransition(async () => {
                const result = await createWholesaleDispatchAction(partnerId, orderId, {
                  carrier: String(formData.get("carrier") ?? ""), trackingNumber: String(formData.get("trackingNumber") ?? ""),
                  dispatchedAt: String(formData.get("dispatchedAt") ?? ""), notes: String(formData.get("notes") ?? ""),
                });
                if (result.error) setDispatchError(result.error);
                else window.location.reload();
              });
            }}>
              <input name="carrier" className="input" placeholder="Carrier / transporter" required />
              <input name="trackingNumber" className="input" placeholder="Tracking / LR number" required />
              <input name="dispatchedAt" className="input" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
              <input name="notes" className="input" placeholder="Notes (optional)" />
              <div className="sm:col-span-2"><button className="btn-outline" disabled={pending}>Save dispatch details</button></div>
              {dispatchError && <p className="sm:col-span-2 text-sm text-danger">{dispatchError}</p>}
            </form>
          )}
        </div>
      )}
    </div>
  );
}
