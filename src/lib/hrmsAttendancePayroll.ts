import { prisma } from "@/lib/prisma";
import { withRecordLock } from "@/lib/withRecordLock";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { assertModuleAccess, assertPartnerCanWrite } from "@/lib/tenant";
import { upsertPayslip } from "@/lib/hrms";
import { calculateAttendancePayroll } from "@/lib/hrmsPayrollCalculation";
import { randomUUID } from "node:crypto";

export async function createAttendancePayroll(partnerId: string, values: Record<string, unknown>) {
  await requireSessionPartnerId(partnerId);
  await assertModuleAccess(partnerId, "hrms");
  await assertPartnerCanWrite(partnerId);
  const employeeId = String(values.employeeId ?? "");
  const month = Number(values.month), year = Number(values.year);
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 1900 || year > 2200) throw new Error("Select a valid payroll period.");
  const start = new Date(Date.UTC(year, month - 1, 1) - 330 * 60000);
  const end = new Date(Date.UTC(year, month, 1) - 330 * 60000);
  if (end > new Date()) throw new Error("Attendance payroll can only be calculated for a completed month.");
  const reviewReason = String(values.reviewReason ?? "").trim();
  if (reviewReason.length < 5 || reviewReason.length > 2000) throw new Error("Enter review notes (5–2,000 characters), including approval for any paid leave credits.");
  const labels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  if (!Array.isArray(values.workingWeekdays) || values.workingWeekdays.some(d => !labels.includes(String(d)))) throw new Error("Choose working weekdays.");
  const workingWeekdays = [...new Set(values.workingWeekdays.map(d => labels.indexOf(String(d))))];
  const excludedDates = String(values.excludedDates ?? "").split(/[\s,]+/).filter(Boolean);
  const basicPayRupees = Number(values.basicPay), allowancesRupees = Number(values.allowances ?? 0), otherDeductionsRupees = Number(values.deductions ?? 0);
  return withRecordLock("hrms-attendance", `${partnerId}:${employeeId}`, async () => {
    if (!await prisma.employee.findFirst({ where: { id: employeeId, partnerId } })) throw new Error("Employee not found.");
    const rows = await prisma.attendanceCheckIn.findMany({ where: { employeeId, checkInAt: { gte: start, lt: end } }, orderBy: [{ checkInAt: "asc" }, { id: "asc" }], take: 2001 });
    if (rows.length > 2000) throw new Error("This period needs a separate attendance review (more than 2,000 shifts).");
    const leaves = await prisma.leaveRequest.findMany({ where: { employeeId, status: "Approved", startDate: { lt: end }, endDate: { gte: start } }, orderBy: { id: "asc" }, take: 501 });
    if (leaves.length > 500) throw new Error("This period needs a separate leave review (more than 500 approved requests).");
    const calculation = calculateAttendancePayroll({ month, year, workingWeekdays, excludedDates, paidLeaveDays: Number(values.paidLeaveDays ?? 0), basicPayPaise: Math.round(basicPayRupees * 100), rows });
    if (!Number.isFinite(otherDeductionsRupees) || otherDeductionsRupees < 0) throw new Error("Other deductions must be non-negative.");
    const payslip = await upsertPayslip(partnerId, { employeeId, month, year, basicPayRupees, allowancesRupees, deductionsRupees: Math.round(otherDeductionsRupees * 100 + calculation.attendanceDeductionPaise) / 100 });
    await prisma.businessRecord.create({ data: { partnerId, moduleSlug: "hrms-payroll-calculation", recordKey: randomUUID(), data: { payslipId: payslip.id, employeeId, month, year, actor: `Owner ${partnerId}`, at: new Date().toISOString(), reviewReason, policy: { workingWeekdays, excludedDates, lateCountsAsFullDay: true, halfDayCredit: 0.5, basis: "Basic pay only; IST check-in date; one credit per day" }, calculation, basicPay: payslip.basicPay, allowances: payslip.allowances, deductions: payslip.deductions, netPay: payslip.netPay, approvedLeave: leaves.map(r => ({ id: r.id, startDate: r.startDate.toISOString(), endDate: r.endDate.toISOString(), leaveType: r.leaveType })), attendance: rows.map(r => ({ id: r.id, checkInAt: r.checkInAt.toISOString(), checkOutAt: r.checkOutAt?.toISOString() ?? null, status: r.status })) } } });
    return payslip;
  });
}

export async function listPayrollCalculations(partnerId: string) {
  await requireSessionPartnerId(partnerId);
  await assertModuleAccess(partnerId, "hrms");
  return prisma.businessRecord.findMany({ where: { partnerId, moduleSlug: "hrms-payroll-calculation" }, orderBy: { createdAt: "desc" }, take: 50 });
}
