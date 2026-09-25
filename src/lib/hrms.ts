/**
 * Data-access layer for the HRMS module's Prisma-backed tables (Employee,
 * AttendanceCheckIn, OfficeLocation, LeaveRequest, LeaveBalance, Payslip —
 * see prisma/schema.prisma's HRMS block). Employee is a deliberately
 * separate table from PartnerStaff (used by Telecalling/POS-adjacent
 * login) — HRMS is NOT coupled to PartnerStaff in any way.
 *
 * Money fields (Payslip.basicPay/allowances/deductions/netPay) are Int
 * paise in the DB, same convention as every other money field in this
 * schema — functions here that take/return RUPEES for UI convenience say
 * so explicitly; everything else is paise.
 */
import { prisma } from "@/lib/prisma";
import { sendPartnerTelegramAlert } from "@/lib/telegram";
import { getPartner } from "@/lib/partnerData";
import {
  hrmsLateCheckInMessage,
  hrmsLeaveRequestSubmittedMessage,
  hrmsLeaveDecidedMessage,
  hrmsPayrollCompletedMessage,
} from "@/lib/telegramTemplates";
import { sendHrmsLeaveDecidedEmail, sendHrmsPayrollCompletedEmail } from "@/lib/email/moduleEmails";

// --- Employees ---------------------------------------------------------

export async function listEmployees(partnerId: string) {
  return prisma.employee.findMany({ where: { partnerId }, orderBy: { name: "asc" } });
}

export async function getEmployee(partnerId: string, id: string) {
  const employee = await prisma.employee.findUnique({ where: { id }, include: { reportingManager: true } });
  if (!employee || employee.partnerId !== partnerId) return null;
  return employee;
}

export type EmployeeInput = {
  name: string;
  contact?: string | null;
  email?: string | null;
  department?: string | null;
  designation?: string | null;
  reportingManagerId?: string | null;
  joiningDate?: Date | null;
  status?: string;
};

export async function createEmployee(partnerId: string, data: EmployeeInput) {
  return prisma.employee.create({
    data: {
      partnerId,
      name: data.name,
      contact: data.contact || null,
      email: data.email || null,
      department: data.department || null,
      designation: data.designation || null,
      reportingManagerId: data.reportingManagerId || null,
      joiningDate: data.joiningDate ?? null,
      status: data.status ?? "Active",
    },
  });
}

export async function updateEmployee(partnerId: string, id: string, data: EmployeeInput) {
  const existing = await getEmployee(partnerId, id);
  if (!existing) throw new Error("Employee not found.");
  // Guard against setting an employee as their own manager.
  const reportingManagerId = data.reportingManagerId === id ? null : data.reportingManagerId || null;
  return prisma.employee.update({
    where: { id },
    data: {
      name: data.name,
      contact: data.contact || null,
      email: data.email || null,
      department: data.department || null,
      designation: data.designation || null,
      reportingManagerId,
      joiningDate: data.joiningDate ?? null,
      status: data.status ?? existing.status,
    },
  });
}

// --- Office Locations ---------------------------------------------------

export async function listOfficeLocations(partnerId: string) {
  return prisma.officeLocation.findMany({ where: { partnerId }, orderBy: { name: "asc" } });
}

export async function getOfficeLocation(partnerId: string, id: string) {
  const loc = await prisma.officeLocation.findUnique({ where: { id } });
  if (!loc || loc.partnerId !== partnerId) return null;
  return loc;
}

export async function createOfficeLocation(
  partnerId: string,
  data: { name: string; lat: number; lng: number; geofenceRadiusMeters?: number }
) {
  return prisma.officeLocation.create({
    data: {
      partnerId,
      name: data.name,
      lat: data.lat,
      lng: data.lng,
      geofenceRadiusMeters: data.geofenceRadiusMeters ?? 200,
    },
  });
}

export async function updateOfficeLocation(
  partnerId: string,
  id: string,
  data: { name: string; lat: number; lng: number; geofenceRadiusMeters?: number }
) {
  const existing = await getOfficeLocation(partnerId, id);
  if (!existing) throw new Error("Office location not found.");
  return prisma.officeLocation.update({
    where: { id },
    data: {
      name: data.name,
      lat: data.lat,
      lng: data.lng,
      geofenceRadiusMeters: data.geofenceRadiusMeters ?? existing.geofenceRadiusMeters,
    },
  });
}

// --- Geofence ------------------------------------------------------------

const EARTH_RADIUS_METERS = 6371000;

/** Pure haversine great-circle distance between two lat/lng points, in meters. */
export function haversineDistanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_METERS * c;
}

export type GeofenceCheckResult =
  | { withinGeofence: true; officeId: string; officeName: string; distanceMeters: number }
  | { withinGeofence: false; nearestOfficeName?: string; nearestDistanceMeters?: number };

/** Checks a lat/lng against every one of the partner's OfficeLocations — "within" means
 * inside ANY single office's own geofenceRadiusMeters. Returns the nearest miss too, so
 * a blocked check-in can tell the user how far off they are. */
export function checkGeofence(
  offices: { id: string; name: string; lat: number; lng: number; geofenceRadiusMeters: number }[],
  lat: number,
  lng: number
): GeofenceCheckResult {
  let nearest: { name: string; distance: number } | undefined;
  for (const office of offices) {
    const distance = haversineDistanceMeters(lat, lng, office.lat, office.lng);
    if (!nearest || distance < nearest.distance) nearest = { name: office.name, distance };
    if (distance <= office.geofenceRadiusMeters) {
      return { withinGeofence: true, officeId: office.id, officeName: office.name, distanceMeters: Math.round(distance) };
    }
  }
  return {
    withinGeofence: false,
    nearestOfficeName: nearest?.name,
    nearestDistanceMeters: nearest ? Math.round(nearest.distance) : undefined,
  };
}

// --- Attendance ------------------------------------------------------------

/**
 * Check-in flow. DESIGN CHOICE (documented per task): an employee check-in
 * submitted from OUTSIDE every registered OfficeLocation's geofence is
 * BLOCKED (returns an error, no row written) rather than allowed-but-flagged.
 * Blocking is the safer default for a real attendance app (an unflagged
 * "Present" row from outside every office would silently defeat the whole
 * point of the geofence check) — adjustable later behind a partner setting
 * if a legitimate remote/field-work case shows up. If the partner has no
 * OfficeLocation registered at all, check-in is allowed through
 * unconditionally (status "Present") since there's nothing to validate
 * against yet — that's a setup gap, not a geofence violation.
 *
 * "Late" is NOT computed from any configurable cutoff time in this pass
 * (per the task's own guidance to not over-engineer that) — status simply
 * defaults "Present" and can be adjusted later (e.g. from the history view)
 * by a follow-up pass; only the "outside every geofence" case is treated as
 * an exceptional condition worth blocking on here.
 */
export async function checkIn(
  partnerId: string,
  employeeId: string,
  lat: number,
  lng: number
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const employee = await getEmployee(partnerId, employeeId);
  if (!employee) return { ok: false, error: "Employee not found." };

  const openToday = await getOpenCheckInToday(employeeId);
  if (openToday) return { ok: false, error: "Already checked in today — check out first before checking in again." };

  const offices = await listOfficeLocations(partnerId);
  let status = "Present";
  if (offices.length > 0) {
    const result = checkGeofence(offices, lat, lng);
    if (!result.withinGeofence) {
      const nearest =
        result.nearestOfficeName && result.nearestDistanceMeters !== undefined
          ? ` Nearest registered office is "${result.nearestOfficeName}", ${result.nearestDistanceMeters}m away.`
          : "";
      const partner = await getPartner(partnerId);
      if (partner) {
        const message = await hrmsLateCheckInMessage({
          partnerBusinessName: partner.businessName,
          employeeName: employee.name,
          nearestOfficeInfo: nearest,
        });
        await sendPartnerTelegramAlert(partnerId, "hrmsLateCheckIn", message);
      }
      return { ok: false, error: `Check-in blocked: you are not within any registered office's geofence.${nearest}` };
    }
  }

  const row = await prisma.attendanceCheckIn.create({
    data: { employeeId, checkInLat: lat, checkInLng: lng, status },
  });
  return { ok: true, id: row.id };
}

/** Finds today's open (checkOutAt null) AttendanceCheckIn row for this employee, if any. */
export async function getOpenCheckInToday(employeeId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return prisma.attendanceCheckIn.findFirst({
    where: { employeeId, checkOutAt: null, checkInAt: { gte: startOfDay } },
    orderBy: { checkInAt: "desc" },
  });
}

export async function checkOut(
  partnerId: string,
  employeeId: string,
  lat: number,
  lng: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const employee = await getEmployee(partnerId, employeeId);
  if (!employee) return { ok: false, error: "Employee not found." };
  const open = await getOpenCheckInToday(employeeId);
  if (!open) return { ok: false, error: "No open check-in found for today." };
  await prisma.attendanceCheckIn.update({
    where: { id: open.id },
    data: { checkOutAt: new Date(), checkOutLat: lat, checkOutLng: lng },
  });
  return { ok: true };
}

export async function listAttendanceHistory(
  partnerId: string,
  filters: { employeeId?: string; from?: string; to?: string }
) {
  const employees = await listEmployees(partnerId);
  const employeeIds = employees.map((e) => e.id);
  if (employeeIds.length === 0) return [];

  const where: Record<string, unknown> = {
    employeeId: filters.employeeId ? filters.employeeId : { in: employeeIds },
  };
  if (filters.from || filters.to) {
    const checkInAt: Record<string, Date> = {};
    if (filters.from) checkInAt.gte = new Date(filters.from);
    if (filters.to) {
      const toDate = new Date(filters.to);
      toDate.setHours(23, 59, 59, 999);
      checkInAt.lte = toDate;
    }
    where.checkInAt = checkInAt;
  }

  return prisma.attendanceCheckIn.findMany({
    where,
    include: { employee: true },
    orderBy: { checkInAt: "desc" },
  });
}

// --- Leave -----------------------------------------------------------------

export async function listLeaveRequests(partnerId: string, employeeId?: string) {
  const employees = await listEmployees(partnerId);
  const employeeIds = employeeId ? [employeeId] : employees.map((e) => e.id);
  if (employeeIds.length === 0) return [];
  return prisma.leaveRequest.findMany({
    where: { employeeId: { in: employeeIds } },
    include: { employee: true },
    orderBy: { appliedAt: "desc" },
  });
}

export async function createLeaveRequest(
  partnerId: string,
  data: { employeeId: string; leaveType: string; startDate: Date; endDate: Date; reason?: string }
) {
  const employee = await getEmployee(partnerId, data.employeeId);
  if (!employee) throw new Error("Employee not found.");
  const request = await prisma.leaveRequest.create({
    data: {
      employeeId: data.employeeId,
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      reason: data.reason || null,
    },
  });
  const partner = await getPartner(partnerId);
  if (partner) {
    const message = await hrmsLeaveRequestSubmittedMessage({
      partnerBusinessName: partner.businessName,
      employeeName: employee.name,
      leaveType: data.leaveType,
      startDate: data.startDate.toDateString(),
      endDate: data.endDate.toDateString(),
    });
    await sendPartnerTelegramAlert(partnerId, "hrmsLeaveRequestSubmitted", message);
  }
  return request;
}

/** Approve/reject a pending LeaveRequest. On Approved, increments the matching
 * LeaveBalance.usedDays by the request's day span (creating a zero-total
 * balance row on the fly if one doesn't exist yet, rather than failing —
 * balances are informational in this pass, not a hard cap enforced here). */
export async function decideLeaveRequest(
  partnerId: string,
  leaveId: string,
  decision: "Approved" | "Rejected",
  decidedBy: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const request = await prisma.leaveRequest.findUnique({ where: { id: leaveId }, include: { employee: true } });
  if (!request || request.employee.partnerId !== partnerId) return { ok: false, error: "Leave request not found." };
  if (request.status !== "Pending") return { ok: false, error: "Leave request is no longer pending." };

  const days = Math.max(1, Math.round((request.endDate.getTime() - request.startDate.getTime()) / 86400000) + 1);

  await prisma.$transaction(async (tx) => {
    await tx.leaveRequest.update({
      where: { id: leaveId },
      data: { status: decision, decidedAt: new Date(), decidedBy },
    });
    if (decision === "Approved") {
      const existingBalance = await tx.leaveBalance.findUnique({
        where: { employeeId_leaveType: { employeeId: request.employeeId, leaveType: request.leaveType } },
      });
      if (existingBalance) {
        await tx.leaveBalance.update({ where: { id: existingBalance.id }, data: { usedDays: existingBalance.usedDays + days } });
      } else {
        await tx.leaveBalance.create({
          data: { employeeId: request.employeeId, leaveType: request.leaveType, totalDays: 0, usedDays: days },
        });
      }
    }
  });

  const partner = await getPartner(partnerId);
  if (partner) {
    const message = await hrmsLeaveDecidedMessage({
      partnerBusinessName: partner.businessName,
      employeeName: request.employee.name,
      leaveType: request.leaveType,
      startDate: request.startDate.toDateString(),
      endDate: request.endDate.toDateString(),
      decision,
    });
    await sendPartnerTelegramAlert(partnerId, "hrmsLeaveDecided", message);
    // Email only if the employee has a real email on file — Employee.email is optional.
    if (request.employee.email) {
      await sendHrmsLeaveDecidedEmail({
        to: request.employee.email,
        partnerBusinessName: partner.businessName,
        employeeName: request.employee.name,
        leaveType: request.leaveType,
        startDate: request.startDate.toDateString(),
        endDate: request.endDate.toDateString(),
        decision,
      });
    }
  }
  return { ok: true };
}

export async function listLeaveBalances(employeeId: string) {
  return prisma.leaveBalance.findMany({ where: { employeeId }, orderBy: { leaveType: "asc" } });
}

// --- Payroll -----------------------------------------------------------------

export async function listPayslips(partnerId: string, employeeId?: string) {
  const employees = await listEmployees(partnerId);
  const employeeIds = employeeId ? [employeeId] : employees.map((e) => e.id);
  if (employeeIds.length === 0) return [];
  return prisma.payslip.findMany({
    where: { employeeId: { in: employeeIds } },
    include: { employee: true },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
}

/** Creates or replaces a Payslip for an employee/month/year (unique constraint — an
 * existing row for that period is updated instead of duplicated). All money inputs
 * are RUPEES for form convenience and converted to paise here. */
export async function upsertPayslip(
  partnerId: string,
  data: { employeeId: string; month: number; year: number; basicPayRupees: number; allowancesRupees: number; deductionsRupees: number; status?: string }
) {
  const employee = await getEmployee(partnerId, data.employeeId);
  if (!employee) throw new Error("Employee not found.");
  const basicPay = Math.round(data.basicPayRupees * 100);
  const allowances = Math.round(data.allowancesRupees * 100);
  const deductions = Math.round(data.deductionsRupees * 100);
  const netPay = basicPay + allowances - deductions;

  return prisma.payslip.upsert({
    where: { employeeId_month_year: { employeeId: data.employeeId, month: data.month, year: data.year } },
    create: {
      employeeId: data.employeeId,
      month: data.month,
      year: data.year,
      basicPay,
      allowances,
      deductions,
      netPay,
      status: data.status ?? "Draft",
    },
    update: { basicPay, allowances, deductions, netPay, status: data.status ?? "Draft" },
  });
}

/** Sets a Payslip's status, firing the payroll-completed alert on a transition into
 * "Finalized" specifically (not on every save, and not again if already Finalized). */
export async function setPayslipStatus(partnerId: string, payslipId: string, status: string): Promise<void> {
  const payslip = await prisma.payslip.findUnique({ where: { id: payslipId }, include: { employee: true } });
  if (!payslip || payslip.employee.partnerId !== partnerId) throw new Error("Payslip not found.");
  const wasFinalized = payslip.status === "Finalized" || payslip.status === "Paid";
  await prisma.payslip.update({ where: { id: payslipId }, data: { status } });
  if (!wasFinalized && status === "Finalized") {
    const partner = await getPartner(partnerId);
    if (partner) {
      const message = await hrmsPayrollCompletedMessage({
        partnerBusinessName: partner.businessName,
        employeeName: payslip.employee.name,
        month: payslip.month,
        year: payslip.year,
        netPay: `Rs ${(payslip.netPay / 100).toLocaleString("en-IN")}`,
      });
      await sendPartnerTelegramAlert(partnerId, "hrmsPayrollCompleted", message);
      // Email only if the employee has a real email on file — Employee.email is optional.
      if (payslip.employee.email) {
        await sendHrmsPayrollCompletedEmail({
          to: payslip.employee.email,
          partnerBusinessName: partner.businessName,
          employeeName: payslip.employee.name,
          month: payslip.month,
          year: payslip.year,
          netPay: `Rs ${(payslip.netPay / 100).toLocaleString("en-IN")}`,
        });
      }
    }
  }
}
