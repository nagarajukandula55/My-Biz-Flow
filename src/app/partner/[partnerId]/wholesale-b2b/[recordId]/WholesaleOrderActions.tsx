"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { StatusChip } from "@/components/StatusChip";
import { createInvoiceFromWholesaleOrderAction } from "../actions";

/**
 * Small client panel on the wholesale-b2b order detail page: shows the
 * computed tiered price breakdown, the dealer's credit exposure, and a
 * Create Invoice action once the order is Dispatched or Delivered —
 * mirrors the Create Invoice button on service-centre's WorkorderLifecycle.
 */
export function WholesaleOrderActions({
  partnerId,
  orderId,
  status,
  itemQuantity,
  itemListPrice,
  unitPrice,
  discountPercent,
  bulkPriceTotal,
  creditLimit,
  outstandingBalance,
  invoiceId,
}: {
  partnerId: string;
  orderId: string;
  status: string;
  itemQuantity: number;
  itemListPrice: number;
  unitPrice: number;
  discountPercent: number;
  bulkPriceTotal: number;
  creditLimit: number;
  outstandingBalance: number;
  invoiceId?: string;
}) {
  const [invoice, setInvoice] = useState(invoiceId);
  const [pending, startTransition] = useTransition();
  const canInvoice = (status === "Dispatched" || status === "Delivered") && !invoice;
  const overLimit = creditLimit > 0 && outstandingBalance > creditLimit;

  function createInvoice() {
    startTransition(async () => {
      await createInvoiceFromWholesaleOrderAction(partnerId, orderId);
      setInvoice("pending");
    });
  }

  return (
    <div className="rounded-md border border-border bg-bg-raised p-4">
      <h2 className="font-display text-base font-bold text-text">Tiered Pricing & Credit</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">List Price x Qty</div>
          <div className="mt-0.5 text-sm text-text">₹{itemListPrice} x {itemQuantity}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Bulk Discount Applied</div>
          <div className="mt-0.5 text-sm text-text">{discountPercent}% off -&gt; ₹{unitPrice}/unit</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Order Total</div>
          <div className="mt-0.5 text-sm font-semibold text-text">₹{bulkPriceTotal}</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusChip
          label={`Dealer outstanding: ₹${Math.round(outstandingBalance)} / ₹${creditLimit} limit`}
          variant={overLimit ? "danger" : "neutral"}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        {canInvoice && (
          <button type="button" className="btn-outline" disabled={pending} onClick={createInvoice}>
            Create Invoice
          </button>
        )}
        {invoice && (
          <Link href={`/partner/${partnerId}/billing`} className="btn-outline">
            Invoiced — view Billing
          </Link>
        )}
      </div>
    </div>
  );
}
