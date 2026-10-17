/**
 * Data-access layer for the HRMS module's Prisma-backed tables (Employee,
 * AttendanceCheckIn, OfficeLocation, LeaveRequest, LeaveBalance, Payslip —
 * see prisma/schema.prisma's HRMS block). Employee is a deliberately
 * separate table from PartnerStaff (used by Telecalling/POS-adjacent
 * login). Optional employee attendance credentials use dedicated HrmsEmployee
 * staff rows, bound explicitly by hrmsEmployeeAccess; existing staff are unchanged.
 *
 * Money fields (Payslip.basicPay/allowances/deductions/netPay) are Int
 * paise in the DB, same convention as every other money field in this
 * schema — functions here that take/return RUPEES for UI convenience say
 * so explicitly; everything else is paise.
 */
import { withRecordLock } from "@/lib/withRecordLock";
import { assertModuleAccess, assertPartnerCanWrite } from "@/lib/tenant";
import { afterDatabaseCommit } from "@/lib/databaseTransaction";
import { prisma } from "@/lib/prisma";
import * as crypto from "node:crypto";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { formatDate, istStartOfDay } from "@/lib/format";
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
  if (employee.reportingManager?.partnerId !== partnerId) employee.reportingManager = null;
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
  await assertModuleAccess(partnerId, "hrms");
  await assertPartnerCanWrite(partnerId);
  await validateEmployee(partnerId, data);
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
  await assertModuleAccess(partnerId, "hrms");
  await assertPartnerCanWrite(partnerId);
  await validateEmployee(partnerId, data);
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

async function validateEmployee(partnerId: string, data: EmployeeInput) {
  if (!data.name.trim()) throw new Error("Employee name is required.");
  if (data.status && !["Active", "OnLeave", "Resigned", "Terminated"].includes(data.status)) throw new Error("Invalid employee status.");
  if (data.joiningDate && !Number.isFinite(data.joiningDate.getTime())) throw new Error("Invalid joining date.");
  if (data.reportingManagerId && !await prisma.employee.findFirst({ where: { id: data.reportingManagerId, partnerId }, select: { id: true } })) throw new Error("Reporting manager must belong to this business.");
}

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
  await assertModuleAccess(partnerId, "hrms");
  await assertPartnerCanWrite(partnerId);
  validateOffice(data);
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
  await assertModuleAccess(partnerId, "hrms");
  await assertPartnerCanWrite(partnerId);
  validateOffice(data);
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

export function validCoordinates(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}
function validateOffice(data: { name: string; lat: number; lng: number; geofenceRadiusMeters?: number }) {
  if (!data.name.trim() || !validCoordinates(data.lat, data.lng)) throw new Error("Enter a name and valid latitude/longitude.");
  if (data.geofenceRadiusMeters != null && (!Number.isSafeInteger(data.geofenceRadiusMeters) || data.geofenceRadiusMeters < 1 || data.geofenceRadiusMeters > 100000)) throw new Error("Geofence radius must be a whole number between 1 and 100000 metres.");
}
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
  if (!validCoordinates(lat, lng)) return { withinGeofence: false };
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
 * point of the geofence check). The owner can explicitly enable Remote / field
 * for an employee, or restrict that employee to assigned offices. If the partner has no
 * OfficeLocation registered at all, check-in is blocked until geofence
 * setup is complete. An owner-operated attendance screen does not prove
 * the selected employee's identity and is not facial recognition.
 *
 * "Late" is NOT computed from any configurable cutoff time in this pass
 * (per the task's own guidance to not over-engineer that) — status simply
 * defaults "Present" and can be corrected with an audited reason from history;
 * the "outside every permitted geofence" case is treated as
 * an exceptional condition worth blocking on here.
 */
export async function checkIn(
  partnerId: string,
  employeeId: string,
  lat: number,
  lng: number
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await assertModuleAccess(partnerId, "hrms");
  await assertPartnerCanWrite(partnerId);
  if (!validCoordinates(lat, lng)) return { ok: false, error: "A valid device location is required." };
  return withRecordLock("hrms-attendance", `${partnerId}:${employeeId}`, async () => {
    const employee = await getEmployee(partnerId, employeeId);
    if (!employee || employee.status !== "Active") return { ok: false, error: "Employee not found." };

    const openToday = await getOpenCheckInToday(employeeId, partnerId);
    if (openToday) return { ok: false, error: "An open shift already exists — check out before checking in again." };

    const policy = await getAttendancePolicy(partnerId, employeeId);
    const offices = policy.mode === "Remote / field" ? [] : (await listOfficeLocations(partnerId)).filter(office => policy.mode !== "Assigned offices" || policy.officeIds.includes(office.id));
    if (policy.mode !== "Remote / field" && !offices.length) return { ok: false, error: "Configure an allowed office geofence before recording attendance." };
    const status = "Present";
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
          await afterDatabaseCommit(() => sendPartnerTelegramAlert(partnerId, "hrmsLateCheckIn", message));
        }
        return { ok: false, error: `Check-in blocked: you are not within any registered office's geofence.${nearest}` };
      }
    }

    const row = await prisma.attendanceCheckIn.create({
      data: { employeeId, checkInLat: lat, checkInLng: lng, status },
    });
    await prisma.businessRecord.create({ data: { partnerId, moduleSlug: "hrms-attendance-policy-snapshot", recordKey: row.id, data: { mode: policy.mode, officeIds: policy.officeIds } } });
    return { ok: true, id: row.id };
  });
}

/** Finds an open shift, including one started before midnight. Tenant scope is mandatory. */
export async function getOpenCheckInToday(employeeId: string, partnerId: string) {
  return prisma.attendanceCheckIn.findFirst({
    where: { employeeId, employee: { partnerId }, checkOutAt: null },
    orderBy: { checkInAt: "desc" },
  });
}

export async function listOpenCheckIns(partnerId: string) {
  return prisma.attendanceCheckIn.findMany({
    where: { employee: { partnerId }, checkOutAt: null }, select: { employeeId: true }, distinct: ["employeeId"],
  });
}

export async function checkOut(
  partnerId: string,
  employeeId: string,
  lat: number,
  lng: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  await assertModuleAccess(partnerId, "hrms");
  await assertPartnerCanWrite(partnerId);
  if (!validCoordinates(lat, lng)) return { ok: false, error: "A valid device location is required." };
  return withRecordLock("hrms-attendance", `${partnerId}:${employeeId}`, async () => {
    const employee = await getEmployee(partnerId, employeeId);
    if (!employee || employee.status !== "Active") return { ok: false, error: "Employee not found." };
    const open = await getOpenCheckInToday(employeeId, partnerId);
    if (!open) return { ok: false, error: "No open check-in found." };
    await prisma.attendanceCheckIn.update({
      where: { id: open.id },
      data: { checkOutAt: new Date(), checkOutLat: lat, checkOutLng: lng },
    });
    return { ok: true };
  });
}

const ATTENDANCE_HISTORY_SAFETY_LIMIT = 500;

export type AttendancePolicy = { mode: "Any office" | "Assigned offices" | "Remote / field"; officeIds: string[] };
export async function getAttendancePolicy(partnerId: string, employeeId: string): Promise<AttendancePolicy> {
  const row = await prisma.businessRecord.findUnique({ where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "hrms-attendance-policy", recordKey: employeeId } } });
  if (!row) return { mode: "Any office", officeIds: [] };
  const value = row.data as AttendancePolicy;
  if (!["Any office", "Assigned offices", "Remote / field"].includes(value.mode) || !Array.isArray(value.officeIds) || !value.officeIds.every(id => typeof id === "string")) throw new Error("Attendance policy is invalid. Ask the owner to update it.");
  return value;
}

export async function saveAttendancePolicy(partnerId: string, employeeId: string, values: Record<string, unknown>) {
  await requireSessionPartnerId(partnerId);
  await assertModuleAccess(partnerId, "hrms");
  await assertPartnerCanWrite(partnerId);
  return withRecordLock("hrms-attendance", `${partnerId}:${employeeId}`, async () => {
    if (!await getEmployee(partnerId, employeeId)) throw new Error("Employee not found.");
    const mode = String(values.mode);
    if (!["Any office", "Assigned offices", "Remote / field"].includes(mode)) throw new Error("Choose a valid work mode.");
    const selected = values.officeIds ?? [];
    if (!Array.isArray(selected) || selected.length > 100 || !selected.every(id => typeof id === "string")) throw new Error("Select valid offices.");
    const officeIds = mode === "Assigned offices" ? [...new Set(selected as string[])] : [];
    if (mode === "Assigned offices" && (!officeIds.length || await prisma.officeLocation.count({ where: { partnerId, id: { in: officeIds } } }) !== officeIds.length)) throw new Error("Select at least one office belonging to this business.");
    const before = await getAttendancePolicy(partnerId, employeeId);
    const data = { mode, officeIds };
    await prisma.businessRecord.upsert({ where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "hrms-attendance-policy", recordKey: employeeId } }, create: { partnerId, moduleSlug: "hrms-attendance-policy", recordKey: employeeId, data }, update: { data } });
    await prisma.businessRecord.create({ data: { partnerId, moduleSlug: "hrms-policy-audit", recordKey: crypto.randomUUID(), data: { employeeId, actor: `Owner ${partnerId}`, at: new Date().toISOString(), before, after: data } } });
  });
}

/** Corrections retain device coordinates and append an immutable application audit record. */
export async function correctAttendance(partnerId: string, id: string, values: Record<string, unknown>) {
  await requireSessionPartnerId(partnerId);
  await assertModuleAccess(partnerId, "hrms");
  await assertPartnerCanWrite(partnerId);
  const scoped = await prisma.attendanceCheckIn.findFirst({ where: { id, employee: { partnerId } } });
  if (!scoped) throw new Error("Attendance record not found.");
  return withRecordLock("hrms-attendance", `${partnerId}:${scoped.employeeId}`, async () => {
    const row = await prisma.attendanceCheckIn.findUniqueOrThrow({ where: { id } });
    const snapshot = (item: typeof row) => ({ checkInAt: item.checkInAt.toISOString(), checkOutAt: item.checkOutAt?.toISOString() ?? null, status: item.status });
    if (String(values.expected) !== JSON.stringify(snapshot(row))) throw new Error("Attendance changed since this page was opened. Reload before correcting it.");
    const parse = (value: unknown) => { const text = String(value ?? ""); return new Date(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text) ? text + ":00+05:30" : text); };
    const checkInAt = parse(values.checkInAt), checkOutAt = values.checkOutAt ? parse(values.checkOutAt) : null;
    const reason = String(values.reason ?? "").trim(), status = String(values.status);
    if (reason.length < 5 || reason.length > 2000) throw new Error("Give a correction reason between 5 and 2000 characters.");
    if (!["Present", "Late", "HalfDay"].includes(status)) throw new Error("Choose a valid attendance status.");
    if (!Number.isFinite(checkInAt.getTime()) || checkInAt.getTime() > Date.now() || (checkOutAt && (!Number.isFinite(checkOutAt.getTime()) || checkOutAt <= checkInAt || checkOutAt.getTime() > Date.now()))) throw new Error("Enter valid past check-in and check-out times, with checkout after check-in.");
    const period = (date: Date) => { const ist = new Date(date.getTime() + 19800000); return { month: ist.getUTCMonth() + 1, year: ist.getUTCFullYear() }; };
    const monthIndex = (date: Date) => { const p = period(date); return p.year * 12 + p.month - 1; };
    const affected = new Set<number>();
    for (const [start, end] of [[row.checkInAt, row.checkOutAt ?? row.checkInAt], [checkInAt, checkOutAt ?? checkInAt]]) {
      const first = monthIndex(start), last = monthIndex(end);
      if (last - first > 120) throw new Error("Attendance spanning more than ten years requires a separate data review.");
      for (let index = first; index <= last; index++) affected.add(index);
    }
    const periods = [...affected].sort((a,b) => a-b).map(index => ({ year: Math.floor(index/12), month: index%12+1 }));
    const save = async (index: number): Promise<void> => {
      if (index < periods.length) { const p = periods[index]; return withRecordLock("hrms-payroll", `${partnerId}:${row.employeeId}:${p.month}:${p.year}`, () => save(index + 1)); }
      if (await prisma.payslip.findFirst({ where: { employeeId: row.employeeId, status: { in: ["Finalized", "Paid"] }, OR: periods } })) throw new Error("Attendance affecting a finalized or paid payroll period cannot be corrected.");
      if (await prisma.attendanceCheckIn.findFirst({ where: { employeeId: row.employeeId, id: { not: id }, ...(checkOutAt ? { checkInAt: { lt: checkOutAt } } : {}), OR: [{ checkOutAt: null }, { checkOutAt: { gt: checkInAt } }] } })) throw new Error("The corrected shift overlaps another shift.");
      const updated = await prisma.attendanceCheckIn.update({ where: { id }, data: { checkInAt, checkOutAt, status } });
      await prisma.businessRecord.create({ data: { partnerId, moduleSlug: "hrms-attendance-audit", recordKey: crypto.randomUUID(), data: { attendanceId: id, employeeId: row.employeeId, actor: `Owner ${partnerId}`, at: new Date().toISOString(), reason, before: snapshot(row), after: snapshot(updated) } } });
    };
    await save(0);
  });
}

export async function attendanceAudit(partnerId: string, id: string) {
  await requireSessionPartnerId(partnerId);
  await assertModuleAccess(partnerId, "hrms");
  return prisma.businessRecord.findMany({ where: { partnerId, moduleSlug: "hrms-attendance-audit", data: { path: ["attendanceId"], equals: id } }, orderBy: { createdAt: "desc" }, take: 50 });
}

export async function listAttendanceHistory(
  partnerId: string,
  filters: { employeeId?: string; from?: string; to?: string; page?: number }
) {
  const where: Record<string, unknown> = {
    employee: { partnerId },
    ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
  };
  if (filters.from || filters.to) {
    for (const date of [filters.from, filters.to]) if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date)) return [];
    if (filters.from && filters.to && filters.from > filters.to) return [];
    const checkInAt: Record<string, Date> = {};
    if (filters.from) checkInAt.gte = new Date(`${filters.from}T00:00:00+05:30`);
    if (filters.to) {
      const toDate = new Date(`${filters.to}T23:59:59.999+05:30`);
      checkInAt.lte = toDate;
    }
    where.checkInAt = checkInAt;
  }

  // The report requests 50 rows plus one next-page sentinel. Existing detail
  // callers retain a bounded history until their own summaries are paginated.
  return prisma.attendanceCheckIn.findMany({
    where,
    include: { employee: true },
    orderBy: [{ checkInAt: "desc" }, { id: "desc" }],
    take: filters.page === undefined ? ATTENDANCE_HISTORY_SAFETY_LIMIT : 51,
    skip: filters.page === undefined ? 0 : (Math.min(10000, Math.max(1, Math.floor(filters.page) || 1)) - 1) * 50,
  });
}

// --- Leave -----------------------------------------------------------------

const LEAVE_REQUESTS_SAFETY_LIMIT = 500;

export async function listLeaveRequests(partnerId: string, employeeId?: string) {
  // TODO: hrms/leave/page.tsx (no employeeId → whole-partner) renders this
  // full list directly with no pagination UI yet; the hrms/[recordId]/
  // page.tsx detail-page caller passes employeeId for one employee's
  // naturally-bounded history. Capped with a safety ceiling rather than left
  // fully unbounded — follow up with real page/pageSize pagination on the
  // whole-partner leave page (mirroring listBusinessRecordsPaginated +
  // PaginationControls, see billing/page.tsx).
  return prisma.leaveRequest.findMany({
    where: { employee: { partnerId }, ...(employeeId ? { employeeId } : {}) },
    include: { employee: true },
    orderBy: { appliedAt: "desc" },
    take: LEAVE_REQUESTS_SAFETY_LIMIT,
  });
}

export async function createLeaveRequest(
  partnerId: string,
  data: { employeeId: string; leaveType: string; startDate: Date; endDate: Date; reason?: string }
) {
  await assertModuleAccess(partnerId, "hrms");
  await assertPartnerCanWrite(partnerId);
  if (!data.leaveType.trim() || !Number.isFinite(data.startDate.getTime()) || !Number.isFinite(data.endDate.getTime()) || data.endDate < data.startDate) throw new Error("Select a leave type and valid start/end dates.");
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
      startDate: formatDate(data.startDate.toISOString()),
      endDate: formatDate(data.endDate.toISOString()),
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
  await assertModuleAccess(partnerId, "hrms");
  await assertPartnerCanWrite(partnerId);
  if (decision !== "Approved" && decision !== "Rejected") return { ok: false, error: "Invalid leave decision." };
  const scopedLeave = await prisma.leaveRequest.findFirst({ where: { id: leaveId, employee: { partnerId } }, select: { employeeId: true } });
  if (!scopedLeave) return { ok: false, error: "Leave request not found." };
  return withRecordLock("hrms-attendance", `${partnerId}:${scopedLeave.employeeId}`, () => withRecordLock("hrms-leave", `${partnerId}:${leaveId}`, async () => {
  const request = await prisma.leaveRequest.findUnique({ where: { id: leaveId }, include: { employee: true } });
  if (!request || request.employee.partnerId !== partnerId) return { ok: false, error: "Leave request not found." };
  if (request.status !== "Pending") return { ok: false, error: "Leave request is no longer pending." };
  const protectedPayroll = await prisma.payslip.findMany({ where: { employeeId: request.employeeId, status: { in: ["Finalized", "Paid"] }, year: { gte: request.startDate.getUTCFullYear() - 1, lte: request.endDate.getUTCFullYear() + 1 } }, select: { month: true, year: true }, take: 1500 });
  if (protectedPayroll.length === 1500) return { ok: false, error: "This leave period requires a separate payroll review." };
  if (decision === "Approved" && protectedPayroll.some(p => new Date(Date.UTC(p.year, p.month - 1, 1) - 19800000) <= request.endDate && new Date(Date.UTC(p.year, p.month, 1) - 19800000) > request.startDate)) return { ok: false, error: "Leave affecting finalized or paid payroll cannot be approved." };

  const days = Math.max(1, Math.round((request.endDate.getTime() - request.startDate.getTime()) / 86400000) + 1);

    await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: { status: decision, decidedAt: new Date(), decidedBy },
    });
    if (decision === "Approved") {
      await prisma.leaveBalance.upsert({
        where: { employeeId_leaveType: { employeeId: request.employeeId, leaveType: request.leaveType } },
        create: { employeeId: request.employeeId, leaveType: request.leaveType, totalDays: 0, usedDays: days },
        update: { usedDays: { increment: days } },
      });
    }

  const partner = await getPartner(partnerId);
  if (partner) {
    const message = await hrmsLeaveDecidedMessage({
      partnerBusinessName: partner.businessName,
      employeeName: request.employee.name,
      leaveType: request.leaveType,
      startDate: formatDate(request.startDate.toISOString()),
      endDate: formatDate(request.endDate.toISOString()),
      decision,
    });
    await afterDatabaseCommit(() => sendPartnerTelegramAlert(partnerId, "hrmsLeaveDecided", message));
    // Email only if the employee has a real email on file — Employee.email is optional.
    if (request.employee.email) {
      await afterDatabaseCommit(() => sendHrmsLeaveDecidedEmail({
          to: request.employee.email!,
        partnerBusinessName: partner.businessName,
        employeeName: request.employee.name,
        leaveType: request.leaveType,
        startDate: formatDate(request.startDate.toISOString()),
        endDate: formatDate(request.endDate.toISOString()),
        decision,
      }));
    }
  }
  return { ok: true };
  }));
}

export async function listLeaveBalances(partnerId: string, employeeId: string) {
  return prisma.leaveBalance.findMany({ where: { employeeId, employee: { partnerId } }, orderBy: { leaveType: "asc" } });
}

// --- Payroll -----------------------------------------------------------------

const PAYSLIPS_SAFETY_LIMIT = 500;

export async function listPayslips(partnerId: string, employeeId?: string) {
  // TODO: hrms/payroll/page.tsx (no employeeId → whole-partner, all months)
  // renders this full list directly with no pagination UI yet; the
  // hrms/[recordId]/page.tsx detail-page caller passes employeeId for one
  // employee's naturally-small payslip history. Capped with a safety
  // ceiling rather than left fully unbounded — follow up with real
  // page/pageSize pagination on the whole-partner payroll page (mirroring
  // listBusinessRecordsPaginated + PaginationControls, see billing/page.tsx).
  return prisma.payslip.findMany({
    where: { employee: { partnerId }, ...(employeeId ? { employeeId } : {}) },
    include: { employee: true },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: PAYSLIPS_SAFETY_LIMIT,
  });
}

/** Creates or replaces a Payslip for an employee/month/year (unique constraint — an
 * existing row for that period is updated instead of duplicated). All money inputs
 * are RUPEES for form convenience and converted to paise here. */
export async function upsertPayslip(
  partnerId: string,
  data: { employeeId: string; month: number; year: number; basicPayRupees: number; allowancesRupees: number; deductionsRupees: number; status?: string }
) {
  await assertModuleAccess(partnerId, "hrms");
  await assertPartnerCanWrite(partnerId);
  if (!Number.isInteger(data.month) || data.month < 1 || data.month > 12 || !Number.isInteger(data.year) || data.year < 1900 || data.year > 2200) throw new Error("Select a valid payroll month and year.");
  if ([data.basicPayRupees, data.allowancesRupees, data.deductionsRupees].some(n => !Number.isFinite(n) || n < 0 || n * 100 > 2147483647)) throw new Error("Enter valid non-negative payroll amounts.");
  if (data.status && data.status !== "Draft") throw new Error("New payroll records must start as drafts.");
  const employee = await getEmployee(partnerId, data.employeeId);
  if (!employee) throw new Error("Employee not found.");
  const basicPay = Math.round(data.basicPayRupees * 100);
  const allowances = Math.round(data.allowancesRupees * 100);
  const deductions = Math.round(data.deductionsRupees * 100);
  const netPay = basicPay + allowances - deductions;
  if (netPay < 0 || netPay > 2147483647) throw new Error("Net pay must be a valid non-negative amount.");

  return withRecordLock("hrms-payroll", `${partnerId}:${data.employeeId}:${data.month}:${data.year}`, async () => {
  const existing = await prisma.payslip.findUnique({ where: { employeeId_month_year: { employeeId: data.employeeId, month: data.month, year: data.year } } });
  if (existing && existing.status !== "Draft") throw new Error("Finalized or paid payslips cannot be overwritten.");
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
  });
}

/** Sets a Payslip's status, firing the payroll-completed alert on a transition into
 * "Finalized" specifically (not on every save, and not again if already Finalized). */
export async function setPayslipStatus(partnerId: string, payslipId: string, status: string): Promise<void> {
  await assertModuleAccess(partnerId, "hrms");
  await assertPartnerCanWrite(partnerId);
  const scoped = await prisma.payslip.findFirst({ where: { id: payslipId, employee: { partnerId } }, select: { employeeId: true, month: true, year: true } });
  if (!scoped) throw new Error("Payslip not found.");
  return withRecordLock("hrms-attendance", `${partnerId}:${scoped.employeeId}`, () => withRecordLock("hrms-payroll", `${partnerId}:${scoped.employeeId}:${scoped.month}:${scoped.year}`, async () => {
  const payslip = await prisma.payslip.findUnique({ where: { id: payslipId }, include: { employee: true } });
  if (!payslip || payslip.employee.partnerId !== partnerId) throw new Error("Payslip not found.");
  if (payslip.status === status) return;
  if (!((payslip.status === "Draft" && status === "Finalized") || (payslip.status === "Finalized" && status === "Paid"))) throw new Error("Finalize a draft before marking it paid. Finalized and paid records cannot be reopened.");
  if (status === "Finalized") {
    const saved = await prisma.businessRecord.findFirst({ where: { partnerId, moduleSlug: "hrms-payroll-calculation", data: { path: ["payslipId"], equals: payslip.id } }, orderBy: { createdAt: "desc" } });
    if (saved) {
      const snapshot = saved.data as { basicPay?: number; allowances?: number; deductions?: number; attendance?: unknown[]; approvedLeave?: unknown[] };
      if (snapshot.basicPay !== payslip.basicPay || snapshot.allowances !== payslip.allowances || snapshot.deductions !== payslip.deductions) throw new Error("This attendance-derived draft was manually changed. Recalculate and review it before finalizing.");
        const start = new Date(Date.UTC(payslip.year, payslip.month - 1, 1) - 19800000);
        const end = new Date(Date.UTC(payslip.year, payslip.month, 1) - 19800000);
        const current = await prisma.attendanceCheckIn.findMany({ where: { employeeId: payslip.employeeId, checkInAt: { gte: start, lt: end } }, orderBy: [{ checkInAt: "asc" }, { id: "asc" }], take: 2001 });
        const evidence = current.map(row => ({ id: row.id, checkInAt: row.checkInAt.toISOString(), checkOutAt: row.checkOutAt?.toISOString() ?? null, status: row.status }));
        const original = Array.isArray(snapshot.attendance) ? snapshot.attendance.map(value => { const row = value as Record<string, unknown>; return { id: row.id, checkInAt: row.checkInAt, checkOutAt: row.checkOutAt, status: row.status }; }) : [];
        if (JSON.stringify(evidence) !== JSON.stringify(original)) throw new Error("Attendance changed after this calculation. Recalculate and review the draft before finalizing.");
        const leaves = await prisma.leaveRequest.findMany({ where: { employeeId: payslip.employeeId, status: "Approved", startDate: { lt: end }, endDate: { gte: start } }, orderBy: { id: "asc" }, take: 501 });
        const leaveEvidence = leaves.map(r => ({ id: r.id, startDate: r.startDate.toISOString(), endDate: r.endDate.toISOString(), leaveType: r.leaveType }));
        const originalLeaves = Array.isArray(snapshot.approvedLeave) ? snapshot.approvedLeave.map(value => { const r = value as Record<string, unknown>; return { id: r.id, startDate: r.startDate, endDate: r.endDate, leaveType: r.leaveType }; }) : null;
        if (JSON.stringify(leaveEvidence) !== JSON.stringify(originalLeaves)) throw new Error("Approved leave changed after this calculation. Recalculate and review the draft before finalizing.");
    }
  }
  const wasFinalized = payslip.status === "Finalized";
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
      await afterDatabaseCommit(() => sendPartnerTelegramAlert(partnerId, "hrmsPayrollCompleted", message));
      // Email only if the employee has a real email on file — Employee.email is optional.
      if (payslip.employee.email) {
        await afterDatabaseCommit(() => sendHrmsPayrollCompletedEmail({
          to: payslip.employee.email!,
          partnerBusinessName: partner.businessName,
          employeeName: payslip.employee.name,
          month: payslip.month,
          year: payslip.year,
          netPay: `Rs ${(payslip.netPay / 100).toLocaleString("en-IN")}`,
        }));
      }
    }
  }
  }));
}
