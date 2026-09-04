"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { StatusChip } from "@/components/StatusChip";
import { computeAttendancePercent, type AttendanceEntry } from "@/lib/sample-data/education";
import { recordFeePaymentAction, markAttendanceAction } from "./actions";

/**
 * Real domain logic panel for an enrollment, rendered above the generic
 * RecordDetail field grid — mirrors WorkorderLifecycle.tsx's role for
 * service-centre workorders: fee payment (creates a real Billing invoice),
 * and attendance tracking (append-only log + computed percentage).
 */
export function EnrollmentPanel({
  partnerId,
  enrollmentId,
  feeAmount,
  feeStatus,
  feeInvoiceId,
  initialAttendanceLog,
}: {
  partnerId: string;
  enrollmentId: string;
  feeAmount: number;
  feeStatus: string;
  feeInvoiceId?: string;
  initialAttendanceLog: AttendanceEntry[];
}) {
  const [status, setStatus] = useState(feeStatus);
  const [invoiceId, setInvoiceId] = useState(feeInvoiceId);
  const [log, setLog] = useState<AttendanceEntry[]>(initialAttendanceLog);
  const [, startTransition] = useTransition();

  const today = new Date().toISOString().slice(0, 10);
  const todayEntry = log.find((e) => e.date === today);
  const attendancePercent = computeAttendancePercent(log);

  function recordFeePayment() {
    startTransition(async () => {
      await recordFeePaymentAction(partnerId, enrollmentId);
      setStatus("Paid");
      setInvoiceId("pending"); // optimistic; revalidation fills in the real id on next load
    });
  }

  function markAttendance(present: boolean) {
    const nextLog = [...log.filter((e) => e.date !== today), { date: today, present }].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    setLog(nextLog);
    startTransition(async () => {
      await markAttendanceAction(partnerId, enrollmentId, present, today);
    });
  }

  return (
    <div className="rounded-md border border-border bg-bg-raised p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <h2 className="font-display text-base font-bold text-text">Fee</h2>
          <p className="mt-1 text-sm text-text-muted">
            Amount due: <span className="font-semibold text-text">₹{feeAmount}</span>
          </p>
          <div className="mt-2 flex items-center gap-2">
            <StatusChip label={status} variant={status === "Paid" ? "success" : status === "Partially Paid" ? "warning" : "danger"} />
            {invoiceId && (
              <Link href={`/partner/${partnerId}/billing/${invoiceId === "pending" ? "" : invoiceId}`} className="text-xs text-teal hover:underline">
                Invoice
              </Link>
            )}
          </div>
          {status !== "Paid" && (
            <button type="button" className="btn-accent mt-3" onClick={recordFeePayment}>
              Record Fee Payment
            </button>
          )}
        </div>

        <div>
          <h2 className="font-display text-base font-bold text-text">Attendance</h2>
          <p className="mt-1 text-sm text-text-muted">
            <span className="font-semibold text-text">{attendancePercent}%</span> present across {log.length} logged
            session{log.length === 1 ? "" : "s"}.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              className={`btn-outline text-xs ${todayEntry?.present ? "border-success text-success" : ""}`}
              onClick={() => markAttendance(true)}
            >
              Mark Present Today
            </button>
            <button
              type="button"
              className={`btn-outline text-xs ${todayEntry && !todayEntry.present ? "border-danger text-danger" : ""}`}
              onClick={() => markAttendance(false)}
            >
              Mark Absent Today
            </button>
          </div>
          {todayEntry && (
            <p className="mt-2 text-xs text-text-muted">
              Today ({today}) marked {todayEntry.present ? "present" : "absent"}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
