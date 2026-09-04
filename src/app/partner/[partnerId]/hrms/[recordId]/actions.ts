"use server";

import { revalidatePath } from "next/cache";
import { getBusinessRecord, updateBusinessRecord } from "@/lib/businessRecords";
import {
  extractHrmsLifecycleFromRecord,
  type AttendanceStatus,
  type LeaveRequest,
  type LeaveRequestStatus,
  type PayslipSummary,
} from "@/lib/sample-data/hrms";

/** Appends an attendance entry (one per date — a re-mark for the same date overwrites it). */
export async function markAttendanceAction(
  partnerId: string,
  employeeId: string,
  date: string,
  status: AttendanceStatus
): Promise<void> {
  const record = await getBusinessRecord(partnerId, "hrms", employeeId);
  if (!record) return;
  const lifecycle = extractHrmsLifecycleFromRecord(record);
  const attendance = [...lifecycle.attendance.filter((a) => a.date !== date), { date, status }].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  await updateBusinessRecord(partnerId, "hrms", employeeId, { ...record, attendance });
  revalidatePath(`/partner/${partnerId}/hrms/${employeeId}`);
}

/** Employee (or HR on their behalf) raises a leave request against the current balance — deduction happens only on approval. */
export async function requestLeaveAction(
  partnerId: string,
  employeeId: string,
  fromDate: string,
  toDate: string,
  reason?: string
): Promise<void> {
  const record = await getBusinessRecord(partnerId, "hrms", employeeId);
  if (!record) return;
  const lifecycle = extractHrmsLifecycleFromRecord(record);
  const days = Math.max(1, Math.round((new Date(toDate).getTime() - new Date(fromDate).getTime()) / 86400000) + 1);
  const request: LeaveRequest = {
    id: `LR-${Date.now()}`,
    fromDate,
    toDate,
    days,
    reason,
    status: "Pending",
  };
  const leaveRequests = [...lifecycle.leaveRequests, request];
  await updateBusinessRecord(partnerId, "hrms", employeeId, { ...record, leaveRequests });
  revalidatePath(`/partner/${partnerId}/hrms/${employeeId}`);
}

/** Approve/reject a pending leave request — approval deducts `days` from the leave balance (fails closed if balance is insufficient). */
export async function decideLeaveAction(
  partnerId: string,
  employeeId: string,
  leaveId: string,
  decision: LeaveRequestStatus
): Promise<{ error?: string }> {
  const record = await getBusinessRecord(partnerId, "hrms", employeeId);
  if (!record) return { error: "Employee record not found." };
  const lifecycle = extractHrmsLifecycleFromRecord(record);
  const request = lifecycle.leaveRequests.find((l) => l.id === leaveId);
  if (!request || request.status !== "Pending") return { error: "Leave request is no longer pending." };

  if (decision === "Approved" && lifecycle.leaveBalance < request.days) {
    return { error: `Insufficient leave balance (${lifecycle.leaveBalance} day(s) remaining, ${request.days} requested).` };
  }

  const leaveRequests = lifecycle.leaveRequests.map((l) =>
    l.id === leaveId ? { ...l, status: decision, decidedAt: new Date().toISOString() } : l
  );
  const leaveBalance = decision === "Approved" ? lifecycle.leaveBalance - request.days : lifecycle.leaveBalance;

  await updateBusinessRecord(partnerId, "hrms", employeeId, { ...record, leaveRequests, leaveBalance });
  revalidatePath(`/partner/${partnerId}/hrms/${employeeId}`);
  return {};
}

/**
 * Runs payroll for a given month: gross pay = baseSalary, minus a per-day
 * deduction for every Absent day that month which is NOT covered by an
 * Approved leave request overlapping that date (i.e. unapproved absence).
 * Idempotent per month — re-running replaces that month's payslip.
 */
export async function runPayrollAction(partnerId: string, employeeId: string, month: string): Promise<void> {
  const record = await getBusinessRecord(partnerId, "hrms", employeeId);
  if (!record) return;
  const lifecycle = extractHrmsLifecycleFromRecord(record);
  const baseSalary = lifecycle.baseSalary;

  const approvedLeaveDates = new Set<string>();
  for (const req of lifecycle.leaveRequests) {
    if (req.status !== "Approved") continue;
    for (let d = new Date(req.fromDate); d <= new Date(req.toDate); d.setDate(d.getDate() + 1)) {
      approvedLeaveDates.add(d.toISOString().slice(0, 10));
    }
  }

  const monthAttendance = lifecycle.attendance.filter((a) => a.date.startsWith(month));
  const unapprovedAbsentDays = monthAttendance.filter(
    (a) => a.status === "Absent" && !approvedLeaveDates.has(a.date)
  ).length;

  const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const perDayRate = baseSalary / daysInMonth;
  const deduction = Math.round(perDayRate * unapprovedAbsentDays);
  const grossPay = baseSalary;
  const netPay = Math.max(0, grossPay - deduction);

  const payslip: PayslipSummary = {
    month,
    baseSalary,
    unapprovedAbsentDays,
    deduction,
    grossPay,
    netPay,
    runAt: new Date().toISOString(),
  };

  const payslips = [...lifecycle.payslips.filter((p) => p.month !== month), payslip].sort((a, b) =>
    a.month.localeCompare(b.month)
  );

  await updateBusinessRecord(partnerId, "hrms", employeeId, { ...record, payslips });
  revalidatePath(`/partner/${partnerId}/hrms/${employeeId}`);
}
