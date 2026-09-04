"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { StatusChip } from "@/components/StatusChip";
import { completeSalonSpaBookingAction, createInvoiceFromBookingAction } from "./actions";

/**
 * Booking completion + commission + billing panel shown above the
 * read-only RecordDetail grid. Commission amount is always computed
 * server-side (completeSalonSpaBookingAction) from the stored price and
 * commissionPercent — this panel only reflects what comes back.
 */
export function SalonSpaLifecycle({
  partnerId,
  recordId,
  initialStatus,
  price,
  commissionPercent,
  initialCommissionAmount,
  invoiceId,
}: {
  partnerId: string;
  recordId: string;
  initialStatus: string;
  price: number;
  commissionPercent: number;
  initialCommissionAmount?: number;
  invoiceId?: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [commissionAmount, setCommissionAmount] = useState(initialCommissionAmount);
  const [invoice, setInvoice] = useState(invoiceId);
  const [, startPersist] = useTransition();

  function markCompleted() {
    setStatus("Completed");
    setCommissionAmount(Math.round((price * commissionPercent) / 100)); // optimistic; server recomputes the same figure
    startPersist(async () => {
      await completeSalonSpaBookingAction(partnerId, recordId);
    });
  }

  function createInvoice() {
    startPersist(async () => {
      await createInvoiceFromBookingAction(partnerId, recordId);
      setInvoice("pending"); // optimistic; page revalidation fills in the real id on next load
    });
  }

  return (
    <div className="rounded-lg border border-border bg-bg-raised p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Status</span>
          <StatusChip
            label={status}
            variant={status === "Completed" ? "success" : status === "Cancelled" || status === "No-show" ? "danger" : "teal"}
          />
          {status === "Completed" && (
            <span className="ml-3 text-sm text-text-muted">
              Commission ({commissionPercent}%):{" "}
              <span className="font-mono font-bold tabular-nums text-text">₹{commissionAmount ?? 0}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {status !== "Completed" && status !== "Cancelled" && (
            <button type="button" className="btn-accent" onClick={markCompleted}>
              Mark Completed
            </button>
          )}
          {status === "Completed" && !invoice && (
            <button type="button" className="btn-outline" onClick={createInvoice}>
              Create Invoice
            </button>
          )}
          {status === "Completed" && invoice && (
            <Link href={`/partner/${partnerId}/billing/${invoice}`} className="btn-outline">
              Sales Invoice
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
