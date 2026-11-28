"use client";

import { useState, useTransition } from "react";
import { StatusChip } from "@/components/StatusChip";
import { Modal } from "@/components/Modal";
import type { PosSale } from "@/lib/sample-data/pos";
import { voidSaleAction } from "../checkout/actions";

export function SaleLinesTable({ partnerId, saleId, sale }: { partnerId: string; saleId: string; sale: PosSale }) {
  const [voidOpen, setVoidOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function confirmVoid() {
    startTransition(async () => {
      setError("");
      try {
        await voidSaleAction(partnerId, saleId, reason);
        setVoidOpen(false);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not void this sale.");
      }
    });
  }

  return (
    <div>
      <div className="rounded-md border border-border bg-bg-raised p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-text">Line Items</h2>
          {sale.status === "Completed" && (
            <button type="button" className="text-xs text-danger hover:underline" onClick={() => setVoidOpen(true)}>
              Void Sale
            </button>
          )}
        </div>
        {sale.status === "Voided" && (
          <div className="mt-2">
            <StatusChip label={`Voided${sale.voidReason ? ` — ${sale.voidReason}` : ""}`} variant="danger" />
          </div>
        )}
        <div className="mt-3 space-y-2">
          {sale.lines.map((line) => (
            <div key={line.id} className="flex items-center justify-between rounded-md border border-border bg-bg px-3 py-2 text-sm">
              <div>
                <span className="font-semibold text-text">{line.productName}</span>
                <span className="ml-2 text-xs text-text-muted">
                  {line.sku} · Qty {line.qty} · ₹{line.unitPrice} · GST {line.taxRate}%
                  {line.discount > 0 ? ` · −₹${line.discount} discount` : ""}
                </span>
              </div>
              <span className="tabular-nums text-text-muted">₹{line.qty * line.unitPrice - line.discount}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between text-text-muted">
            <span>Subtotal</span>
            <span className="tabular-nums">₹{sale.subtotal}</span>
          </div>
          <div className="flex justify-between text-text-muted">
            <span>Discount</span>
            <span className="tabular-nums">−₹{sale.discountTotal}</span>
          </div>
          <div className="flex justify-between text-text-muted">
            <span>Tax</span>
            <span className="tabular-nums">₹{sale.taxAmount}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-text">
            <span>Total</span>
            <span className="tabular-nums">₹{sale.totalAmount}</span>
          </div>
          <div className="flex justify-between text-text-muted">
            <span>Tendered ({sale.tenders.map((t) => t.method).join(" + ")})</span>
            <span className="tabular-nums">₹{sale.amountTendered}</span>
          </div>
          <div className="flex justify-between text-text-muted">
            <span>Change due</span>
            <span className="tabular-nums">₹{sale.changeDue}</span>
          </div>
        </div>
      </div>

      <Modal
        open={voidOpen}
        onClose={() => setVoidOpen(false)}
        title="Void Sale"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setVoidOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-accent" onClick={confirmVoid} disabled={isPending}>
              {isPending ? "Voiding…" : "Void Sale"}
            </button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          Confirm the full cash refund has been paid from this open till. Voiding restores stock and issues a linked Billing credit note. For UPI, Card, Wallet, or mixed payments, use Return / Refund and record the completed refund reference.
        </p>
        {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          className="mt-3 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        />
      </Modal>
    </div>
  );
}
