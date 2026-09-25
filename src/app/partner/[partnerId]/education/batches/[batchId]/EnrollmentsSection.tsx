"use client";

import { useState, useTransition } from "react";
import { StatusChip } from "@/components/StatusChip";
import { formatCurrencyINR } from "@/lib/format";
import {
  enrollStudentAction,
  addFeeInstallmentAction,
  markFeeInstallmentPaidAction,
} from "../actions";

type Installment = {
  id: string;
  dueDate: string; // ISO
  amount: number; // paise
  paidAt: string | null;
  paidAmount: number | null;
};

type EnrollmentRow = {
  id: string;
  status: string;
  student: { id: string; name: string };
  feeInstallments: Installment[];
};

export function EnrollmentsSection({
  partnerId,
  batchId,
  enrollments,
  availableStudents,
  atCapacity,
}: {
  partnerId: string;
  batchId: string;
  enrollments: EnrollmentRow[];
  availableStudents: { id: string; name: string }[];
  atCapacity: boolean;
}) {
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function enroll() {
    setError(null);
    startTransition(async () => {
      const result = await enrollStudentAction(partnerId, batchId, selectedStudentId);
      if (result.error) setError(result.error);
      else setSelectedStudentId("");
    });
  }

  return (
    <div className="rounded-md border border-border bg-bg-raised p-4">
      <h2 className="font-display text-base font-bold text-text">Enrollments</h2>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId(e.target.value)}
          disabled={atCapacity || availableStudents.length === 0}
        >
          <option value="">
            {atCapacity ? "Batch at full capacity" : availableStudents.length === 0 ? "No students available" : "Select a student to enroll…"}
          </option>
          {availableStudents.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-accent text-xs"
          disabled={pending || atCapacity || !selectedStudentId}
          onClick={enroll}
        >
          {pending ? "Enrolling…" : "Enroll Student"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-danger">{error}</p>}

      <div className="mt-4 space-y-2">
        {enrollments.length === 0 && <p className="text-sm text-text-muted">No enrollments yet.</p>}
        {enrollments.map((e) => {
          const totalDue = e.feeInstallments.reduce((sum, i) => sum + i.amount, 0);
          const totalPaid = e.feeInstallments.reduce((sum, i) => sum + (i.paidAmount ?? 0), 0);
          const outstanding = totalDue - totalPaid;
          const isOpen = expandedId === e.id;
          return (
            <div key={e.id} className="rounded-md border border-border bg-bg p-3">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => setExpandedId(isOpen ? null : e.id)}
              >
                <div>
                  <span className="font-semibold text-text">{e.student.name}</span>
                  <span className="ml-2">
                    <StatusChip
                      label={e.status}
                      variant={e.status === "Active" ? "success" : e.status === "Dropped" ? "danger" : "teal"}
                    />
                  </span>
                </div>
                <div className="font-mono text-xs text-text-muted">
                  Due {formatCurrencyINR(totalDue / 100)} · Paid {formatCurrencyINR(totalPaid / 100)} · Outstanding{" "}
                  <span className={outstanding > 0 ? "text-danger" : "text-success"}>{formatCurrencyINR(outstanding / 100)}</span>
                </div>
              </button>
              {isOpen && (
                <FeeInstallments
                  partnerId={partnerId}
                  batchId={batchId}
                  enrollmentId={e.id}
                  installments={e.feeInstallments}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FeeInstallments({
  partnerId,
  batchId,
  enrollmentId,
  installments,
}: {
  partnerId: string;
  batchId: string;
  enrollmentId: string;
  installments: Installment[];
}) {
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function addInstallment() {
    setError(null);
    startTransition(async () => {
      const result = await addFeeInstallmentAction(partnerId, batchId, enrollmentId, dueDate, Number(amount));
      if (result.error) setError(result.error);
      else setAmount("");
    });
  }

  function markPaid(installmentId: string, defaultAmountRupees: number) {
    startTransition(async () => {
      await markFeeInstallmentPaidAction(partnerId, batchId, installmentId, defaultAmountRupees);
    });
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-text-muted">
            <th className="pb-1">Due Date</th>
            <th className="pb-1">Amount</th>
            <th className="pb-1">Status</th>
            <th className="pb-1" />
          </tr>
        </thead>
        <tbody>
          {installments.map((i) => (
            <tr key={i.id} className="border-t border-border/50">
              <td className="py-1.5">{i.dueDate.slice(0, 10)}</td>
              <td className="py-1.5 font-mono">{formatCurrencyINR(i.amount / 100)}</td>
              <td className="py-1.5">
                {i.paidAt ? (
                  <StatusChip label={`Paid ${formatCurrencyINR((i.paidAmount ?? 0) / 100)}`} variant="success" />
                ) : (
                  <StatusChip label="Pending" variant="warning" />
                )}
              </td>
              <td className="py-1.5 text-right">
                {!i.paidAt && (
                  <button
                    type="button"
                    className="btn-outline text-[11px]"
                    disabled={pending}
                    onClick={() => markPaid(i.id, i.amount / 100)}
                  >
                    Mark Paid
                  </button>
                )}
              </td>
            </tr>
          ))}
          {installments.length === 0 && (
            <tr>
              <td colSpan={4} className="py-2 text-text-muted">
                No installments yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-text-muted">Due Date</label>
          <input
            type="date"
            className="rounded-md border border-border bg-bg px-2 py-1.5 text-xs text-text"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-text-muted">Amount (₹)</label>
          <input
            type="number"
            className="w-28 rounded-md border border-border bg-bg px-2 py-1.5 text-xs text-text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <button type="button" className="btn-accent text-xs" disabled={pending} onClick={addInstallment}>
          + Add Installment
        </button>
      </div>
      {error && <p className="mt-1 text-xs font-semibold text-danger">{error}</p>}
    </div>
  );
}
