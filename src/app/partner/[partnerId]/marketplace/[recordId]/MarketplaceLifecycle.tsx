"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { StatusChip } from "@/components/StatusChip";
import { Modal } from "@/components/Modal";
import { PAYOUT_STAGES, type PayoutStatus, type VendorPerformance } from "@/lib/sample-data/marketplace";
import { createOrderForVendorAction, advancePayoutStatusAction } from "./actions";

const PAYOUT_VARIANT: Record<PayoutStatus, "warning" | "amber" | "success"> = {
  Pending: "warning",
  Processing: "amber",
  Paid: "success",
};

export function VendorLifecycle({
  partnerId,
  vendorId,
  commissionRate,
  performance,
  orders,
}: {
  partnerId: string;
  vendorId: string;
  commissionRate: number;
  performance: VendorPerformance;
  orders: { id: string; saleAmount: number; commissionAmount: number; vendorPayoutAmount: number; payoutStatus: PayoutStatus }[];
}) {
  const [orderOpen, setOrderOpen] = useState(false);
  const [saleAmount, setSaleAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, startPersist] = useTransition();

  function submitOrder() {
    const parsed = Number(saleAmount);
    setError(null);
    startPersist(async () => {
      const result = await createOrderForVendorAction(partnerId, vendorId, parsed);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOrderOpen(false);
      setSaleAmount("");
    });
  }

  const commissionAmount = saleAmount && Number(saleAmount) > 0 ? Math.round(Number(saleAmount) * (commissionRate / 100)) : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-bg-raised p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Orders</div>
              <div className="mt-0.5 text-xl font-bold text-text">{performance.orderCount}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Total Sales</div>
              <div className="mt-0.5 text-text">₹{performance.totalSales}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Total Commission</div>
              <div className="mt-0.5 text-text">₹{performance.totalCommission}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Total Payout</div>
              <div className="mt-0.5 text-text">₹{performance.totalPayout}</div>
            </div>
          </div>
          <button type="button" className="btn-accent" onClick={() => setOrderOpen(true)}>
            + Add Order
          </button>
        </div>
        {error && (
          <div className="mt-3 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>
        )}
      </div>

      <div className="rounded-md border border-border bg-bg-raised p-4">
        <h2 className="font-display text-base font-bold text-text">Orders</h2>
        {orders.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">No orders yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {orders.map((o) => (
              <Link
                key={o.id}
                href={`/partner/${partnerId}/marketplace/${o.id}`}
                className="flex items-center justify-between rounded-md border border-border bg-bg px-3 py-2 text-sm hover:border-accent"
              >
                <div>
                  <span className="font-semibold text-text">{o.id}</span>
                  <span className="ml-2 text-xs text-text-muted">Sale ₹{o.saleAmount} — Payout ₹{o.vendorPayoutAmount}</span>
                </div>
                <StatusChip label={o.payoutStatus} variant={PAYOUT_VARIANT[o.payoutStatus]} />
              </Link>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        title="Add Order"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setOrderOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-accent" onClick={submitOrder}>
              Create Order
            </button>
          </>
        }
      >
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">Sale Amount (₹)</label>
          <input
            type="number"
            value={saleAmount}
            onChange={(e) => setSaleAmount(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
          />
          {commissionAmount > 0 && (
            <p className="mt-2 text-xs text-text-muted">
              Commission ({commissionRate}%): ₹{commissionAmount} — Vendor payout: ₹{Number(saleAmount) - commissionAmount}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}

export function OrderLifecycle({
  partnerId,
  orderId,
  vendorId,
  vendorName,
  saleAmount,
  commissionRate,
  commissionAmount,
  vendorPayoutAmount,
  payoutStatus,
  payoutDate,
}: {
  partnerId: string;
  orderId: string;
  vendorId: string;
  vendorName: string;
  saleAmount: number;
  commissionRate: number;
  commissionAmount: number;
  vendorPayoutAmount: number;
  payoutStatus: PayoutStatus;
  payoutDate?: string;
}) {
  const [status, setStatus] = useState(payoutStatus);
  const [date, setDate] = useState(payoutDate);
  const [, startPersist] = useTransition();

  function advance() {
    const idx = PAYOUT_STAGES.indexOf(status);
    const next = PAYOUT_STAGES[idx + 1];
    if (!next) return;
    setStatus(next);
    if (next === "Paid") setDate(new Date().toISOString().slice(0, 10));
    startPersist(async () => {
      await advancePayoutStatusAction(partnerId, orderId);
    });
  }

  return (
    <div className="rounded-md border border-border bg-bg-raised p-4">
      <div className="flex flex-wrap items-center gap-2">
        {PAYOUT_STAGES.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <StatusChip label={s} variant={s === status ? PAYOUT_VARIANT[s] : "neutral"} />
            {i < PAYOUT_STAGES.length - 1 && <span className="text-text-muted">&rarr;</span>}
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Vendor</div>
          <Link href={`/partner/${partnerId}/marketplace/${vendorId}`} className="mt-0.5 block text-accent hover:underline">
            {vendorName}
          </Link>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Sale Amount</div>
          <div className="mt-0.5 text-text">₹{saleAmount}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Commission ({commissionRate}%)</div>
          <div className="mt-0.5 text-text">₹{commissionAmount}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Vendor Payout</div>
          <div className="mt-0.5 text-text">₹{vendorPayoutAmount}</div>
        </div>
      </div>
      {date && <p className="mt-2 text-xs text-text-muted">Paid on {date}</p>}
      {status !== "Paid" && (
        <button type="button" className="btn-accent mt-4" onClick={advance}>
          {status === "Pending" ? "Mark Processing" : "Mark Paid"}
        </button>
      )}
    </div>
  );
}
