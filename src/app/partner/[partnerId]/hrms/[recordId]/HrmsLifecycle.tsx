"use client";

import { useState, useTransition } from "react";
import { StatusChip } from "@/components/StatusChip";
import { Modal } from "@/components/Modal";
import {
  computeAttendancePercent,
  type AttendanceEntry,
  type AttendanceStatus,
  type LeaveRequest,
  type PayslipSummary,
} from "@/lib/sample-data/hrms";
import { markAttendanceAction, requestLeaveAction, decideLeaveAction, runPayrollAction } from "./actions";

const ATTENDANCE_OPTIONS: AttendanceStatus[] = ["Present", "Absent", "Half-day", "Leave"];
const ATTENDANCE_VARIANT: Record<AttendanceStatus, "success" | "danger" | "amber" | "warning"> = {
  Present: "success",
  Absent: "danger",
  "Half-day": "amber",
  Leave: "warning",
};

export function HrmsLifecycle({
  partnerId,
  employeeId,
  baseSalary,
  initialLeaveBalance,
  initialAttendance,
  initialLeaveRequests,
  initialPayslips,
}: {
  partnerId: string;
  employeeId: string;
  baseSalary: number;
  initialLeaveBalance: number;
  initialAttendance: AttendanceEntry[];
  initialLeaveRequests: LeaveRequest[];
  initialPayslips: PayslipSummary[];
}) {
  const [attendance, setAttendance] = useState(initialAttendance);
  const [leaveRequests, setLeaveRequests] = useState(initialLeaveRequests);
  const [leaveBalance, setLeaveBalance] = useState(initialLeaveBalance);
  const [payslips, setPayslips] = useState(initialPayslips);
  const [markOpen, setMarkOpen] = useState(false);
  const [markDate, setMarkDate] = useState(new Date().toISOString().slice(0, 10));
  const [markStatus, setMarkStatus] = useState<AttendanceStatus>("Present");
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveFrom, setLeaveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [leaveTo, setLeaveTo] = useState(new Date().toISOString().slice(0, 10));
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().slice(0, 7));
  const [, startPersist] = useTransition();

  const attendancePercent = computeAttendancePercent(attendance);

  function submitAttendance() {
    const next = [...attendance.filter((a) => a.date !== markDate), { date: markDate, status: markStatus }].sort(
      (a, b) => a.date.localeCompare(b.date)
    );
    setAttendance(next);
    setMarkOpen(false);
    startPersist(async () => {
      await markAttendanceAction(partnerId, employeeId, markDate, markStatus);
    });
  }

  function submitLeaveRequest() {
    const days =
      Math.max(1, Math.round((new Date(leaveTo).getTime() - new Date(leaveFrom).getTime()) / 86400000) + 1);
    const optimistic: LeaveRequest = {
      id: `pending-${Date.now()}`,
      fromDate: leaveFrom,
      toDate: leaveTo,
      days,
      reason: leaveReason,
      status: "Pending",
    };
    setLeaveRequests((prev) => [...prev, optimistic]);
    setLeaveOpen(false);
    setLeaveReason("");
    startPersist(async () => {
      await requestLeaveAction(partnerId, employeeId, leaveFrom, leaveTo, leaveReason);
    });
  }

  function decide(leaveId: string, decision: "Approved" | "Rejected") {
    setLeaveError(null);
    startPersist(async () => {
      const result = await decideLeaveAction(partnerId, employeeId, leaveId, decision);
      if (result.error) {
        setLeaveError(result.error);
        return;
      }
      setLeaveRequests((prev) =>
        prev.map((l) => (l.id === leaveId ? { ...l, status: decision, decidedAt: new Date().toISOString() } : l))
      );
      if (decision === "Approved") {
        const req = leaveRequests.find((l) => l.id === leaveId);
        if (req) setLeaveBalance((b) => b - req.days);
      }
    });
  }

  function runPayroll() {
    startPersist(async () => {
      await runPayrollAction(partnerId, employeeId, payrollMonth);
      // Compute the same summary client-side for immediate display; the server run is the source of truth.
      const approvedDates = new Set<string>();
      for (const r of leaveRequests) {
        if (r.status !== "Approved") continue;
        for (let d = new Date(r.fromDate); d <= new Date(r.toDate); d.setDate(d.getDate() + 1)) {
          approvedDates.add(d.toISOString().slice(0, 10));
        }
      }
      const monthAttendance = attendance.filter((a) => a.date.startsWith(payrollMonth));
      const unapprovedAbsentDays = monthAttendance.filter((a) => a.status === "Absent" && !approvedDates.has(a.date)).length;
      const daysInMonth = new Date(Number(payrollMonth.slice(0, 4)), Number(payrollMonth.slice(5, 7)), 0).getDate();
      const deduction = Math.round((baseSalary / daysInMonth) * unapprovedAbsentDays);
      const netPay = Math.max(0, baseSalary - deduction);
      const summary: PayslipSummary = {
        month: payrollMonth,
        baseSalary,
        unapprovedAbsentDays,
        deduction,
        grossPay: baseSalary,
        netPay,
        runAt: new Date().toISOString(),
      };
      setPayslips((prev) => [...prev.filter((p) => p.month !== payrollMonth), summary]);
    });
  }

  const pendingLeave = leaveRequests.filter((l) => l.status === "Pending");

  return (
    <div className="space-y-6">
      {/* Attendance */}
      <div className="rounded-md border border-border bg-bg-raised p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-text">Attendance</h2>
            <p className="mt-1 text-sm text-text-muted">
              This month: <span className="font-semibold text-text">{attendancePercent}%</span> ({attendance.filter((a) => a.date.startsWith(new Date().toISOString().slice(0, 7))).length} day(s) marked)
            </p>
          </div>
          <button type="button" className="btn-accent" onClick={() => setMarkOpen(true)}>
            Mark Attendance
          </button>
        </div>
        {attendance.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {attendance
              .slice(-10)
              .reverse()
              .map((a) => (
                <StatusChip key={a.date} label={`${a.date} — ${a.status}`} variant={ATTENDANCE_VARIANT[a.status]} />
              ))}
          </div>
        )}
      </div>

      {/* Leave */}
      <div className="rounded-md border border-border bg-bg-raised p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-text">Leave</h2>
            <p className="mt-1 text-sm text-text-muted">
              Balance: <span className="font-semibold text-text">{leaveBalance} day(s)</span>
            </p>
          </div>
          <button type="button" className="btn-outline" onClick={() => setLeaveOpen(true)}>
            Request Leave
          </button>
        </div>
        {leaveError && (
          <div className="mt-3 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">{leaveError}</div>
        )}
        {leaveRequests.length > 0 && (
          <div className="mt-3 space-y-2">
            {leaveRequests
              .slice()
              .reverse()
              .map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-md border border-border bg-bg px-3 py-2 text-sm">
                  <div>
                    <span className="font-semibold text-text">{l.fromDate} → {l.toDate}</span>
                    <span className="ml-2 text-xs text-text-muted">{l.days} day(s){l.reason ? ` — ${l.reason}` : ""}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusChip
                      label={l.status}
                      variant={l.status === "Approved" ? "success" : l.status === "Rejected" ? "danger" : "warning"}
                    />
                    {l.status === "Pending" && !l.id.startsWith("pending-") && (
                      <>
                        <button type="button" className="text-xs text-success hover:underline" onClick={() => decide(l.id, "Approved")}>
                          Approve
                        </button>
                        <button type="button" className="text-xs text-danger hover:underline" onClick={() => decide(l.id, "Rejected")}>
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
        {pendingLeave.length === 0 && leaveRequests.length === 0 && (
          <p className="mt-3 text-sm text-text-muted">No leave requests yet.</p>
        )}
      </div>

      {/* Payroll */}
      <div className="rounded-md border border-border bg-bg-raised p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-text">Payroll</h2>
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={payrollMonth}
              onChange={(e) => setPayrollMonth(e.target.value)}
              className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text"
            />
            <button type="button" className="btn-accent" onClick={runPayroll} disabled={!baseSalary}>
              Run Payroll
            </button>
          </div>
        </div>
        {!baseSalary && <p className="mt-2 text-sm text-text-muted">Set a Base Salary on this employee to run payroll.</p>}
        {payslips.length > 0 && (
          <div className="mt-3 space-y-2">
            {payslips
              .slice()
              .reverse()
              .map((p) => (
                <div key={p.month} className="rounded-md border border-border bg-bg px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text">{p.month}</span>
                    <span className="tabular-nums text-text">Net Pay ₹{p.netPay}</span>
                  </div>
                  <div className="mt-1 text-xs text-text-muted">
                    Gross ₹{p.grossPay} − Deduction ₹{p.deduction} ({p.unapprovedAbsentDays} unapproved absent day(s))
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <Modal
        open={markOpen}
        onClose={() => setMarkOpen(false)}
        title="Mark Attendance"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setMarkOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-accent" onClick={submitAttendance}>
              Save
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">Date</label>
            <input
              type="date"
              value={markDate}
              onChange={(e) => setMarkDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">Status</label>
            <select
              value={markStatus}
              onChange={(e) => setMarkStatus(e.target.value as AttendanceStatus)}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            >
              {ATTENDANCE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title="Request Leave"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setLeaveOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-accent" onClick={submitLeaveRequest}>
              Submit Request
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">From</label>
              <input
                type="date"
                value={leaveFrom}
                onChange={(e) => setLeaveFrom(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">To</label>
              <input
                type="date"
                value={leaveTo}
                onChange={(e) => setLeaveTo(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">Reason (optional)</label>
            <input
              type="text"
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
