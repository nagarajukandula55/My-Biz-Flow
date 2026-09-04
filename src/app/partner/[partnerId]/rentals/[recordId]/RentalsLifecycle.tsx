"use client";

import { useState, useTransition } from "react";
import { StatusChip } from "@/components/StatusChip";
import { Modal } from "@/components/Modal";
import { computeOverdueDays } from "@/lib/sample-data/rentals";
import { returnAssetAction } from "./actions";

export function RentalsLifecycle({
  partnerId,
  bookingId,
  bookingEnd,
  depositAmount,
  status,
  returned: initialReturned,
  refundableAmount: initialRefundableAmount,
  damageCharge: initialDamageCharge,
}: {
  partnerId: string;
  bookingId: string;
  bookingEnd?: string;
  depositAmount?: number;
  status?: string;
  returned?: boolean;
  refundableAmount?: number;
  damageCharge?: number;
}) {
  const [returned, setReturned] = useState(Boolean(initialReturned));
  const [refundableAmount, setRefundableAmount] = useState(initialRefundableAmount);
  const [damageCharge, setDamageCharge] = useState(String(initialDamageCharge ?? ""));
  const [returnNotes, setReturnNotes] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const overdueDays = computeOverdueDays(bookingEnd, returned);

  function confirmReturn() {
    const damage = Number(damageCharge) || 0;
    if (damage < 0) {
      setError("Damage charge can't be negative.");
      return;
    }
    startTransition(async () => {
      const result = await returnAssetAction(partnerId, bookingId, damage, returnNotes);
      if (!result.ok) {
        setError(result.message ?? "Could not record the return.");
        return;
      }
      setReturned(true);
      setRefundableAmount(result.refundableAmount);
      setModalOpen(false);
      setError(null);
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip label={status ?? "Booking"} variant={returned ? "success" : "teal"} />
        {overdueDays > 0 && (
          <StatusChip label={`Overdue — ${overdueDays} day${overdueDays === 1 ? "" : "s"}`} variant="danger" />
        )}
        {returned && <StatusChip label="Asset Returned" variant="success" />}
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-border bg-bg-raised px-3 py-2 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Deposit</div>
          <div className="mt-0.5 text-text">₹{depositAmount ?? 0}</div>
        </div>
        {refundableAmount !== undefined && (
          <div className="rounded-md border border-border bg-bg-raised px-3 py-2 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Refundable</div>
            <div className="mt-0.5 text-text">₹{refundableAmount}</div>
          </div>
        )}
      </div>

      {!returned && (
        <div className="mt-6">
          <button type="button" className="btn-accent" onClick={() => setModalOpen(true)}>
            Return Asset
          </button>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Return Asset"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-accent" onClick={confirmReturn}>
              Confirm Return
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">Damage Charge (₹)</label>
            <input
              type="number"
              value={damageCharge}
              onChange={(e) => setDamageCharge(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">Notes (optional)</label>
            <textarea
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
              rows={2}
            />
          </div>
          {Number(damageCharge) >= 0 && (
            <p className="text-sm text-text-muted">
              Refundable amount: <span className="font-semibold text-text">
                ₹{Math.max(0, (depositAmount ?? 0) - (Number(damageCharge) || 0))}
              </span>{" "}
              (computed server-side on confirm)
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
