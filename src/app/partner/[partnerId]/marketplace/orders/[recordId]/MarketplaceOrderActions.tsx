"use client";

import { useState, useTransition } from "react";
import { StatusChip } from "@/components/StatusChip";
import { MARKETPLACE_ORDER_STATUS_VARIANT } from "@/lib/sample-data/marketplaceOrders";
import { updateMarketplaceOrderStatusAction } from "../actions";
import type { MarketplaceOrderStatusValue } from "@/lib/marketplace";

const NEXT_STATUS: Record<string, MarketplaceOrderStatusValue | null> = {
  Pending: "Confirmed",
  Confirmed: "Shipped",
  Shipped: "Delivered",
  Delivered: null,
  Cancelled: null,
};

/**
 * Status-advance panel on the order detail page. Confirming an order is
 * the one transition that actually decrements the listing's stockQuantity
 * (see updateMarketplaceOrderStatus in src/lib/marketplace.ts) — stock is
 * deliberately NOT touched at order creation, so a merely-placed order
 * never holds stock hostage against other buyers.
 */
export function MarketplaceOrderActions({ partnerId, orderId, status }: { partnerId: string; orderId: string; status: string }) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const nextStatus = NEXT_STATUS[currentStatus];

  function advance(target: MarketplaceOrderStatusValue) {
    setError(null);
    startTransition(async () => {
      const result = await updateMarketplaceOrderStatusAction(partnerId, orderId, target);
      if (result?.error) {
        setError(result.error);
      } else {
        setCurrentStatus(target);
      }
    });
  }

  return (
    <div className="rounded-md border border-border bg-bg-raised p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Status</div>
          <div className="mt-1">
            <StatusChip label={currentStatus} variant={MARKETPLACE_ORDER_STATUS_VARIANT[currentStatus] ?? "neutral"} />
          </div>
        </div>
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
    </div>
  );
}
