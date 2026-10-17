import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { hashPassword, verifyPassword, generatePassword } from "@/lib/passwords";
import { withRecordLock } from "@/lib/withRecordLock";
import { assertModuleAccess, assertPartnerCanWrite } from "@/lib/tenant";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";

export const EMPLOYEE_COOKIE = "mbf_hrms_employee";
const ROLE = "HrmsEmployee";
const PURPOSE = "hrms-employee";
const fingerprint = (hash: string) => createHash("sha256").update(hash).digest("hex");
const key = () => new TextEncoder().encode(env.partnerSessionSecret());
export const employeeLoginId = (employeeId: string) => `HRE-${employeeId}`;

/** Dedicated credentials: never reuses or changes Service Centre/Telecaller staff. */
export async function issueEmployeeAccess(partnerId: string, employeeId: string, disable = false) {
  await requireSessionPartnerId(partnerId);
  await assertModuleAccess(partnerId, "hrms");
  await assertPartnerCanWrite(partnerId);
  return withRecordLock("hrms-employee-access", `${partnerId}:${employeeId}`, async () => {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, partnerId } });
    if (!employee || (!disable && employee.status !== "Active")) throw new Error("An active employee is required.");
    const loginId = employeeLoginId(employeeId);
    const existing = await prisma.partnerStaff.findFirst({ where: { partnerId, loginId } });
    if (existing && existing.role !== ROLE) throw new Error("Login identifier is already in use.");
    if (disable) {
      if (existing) await prisma.partnerStaff.update({ where: { id: existing.id }, data: { status: "Suspended" } });
      return { loginId, password: "" };
    }
    const password = generatePassword(16);
    const data = { name: employee.name, passwordHash: hashPassword(password), mustChangePassword: true, status: "Active" };
    if (existing) await prisma.partnerStaff.update({ where: { id: existing.id }, data });
    else await prisma.partnerStaff.create({ data: { ...data, partnerId, loginId, role: ROLE } });
    return { loginId, password };
  });
}

async function setSession(staff: { id: string; partnerId: string; passwordHash: string }, employeeId: string) {
  const token = await new SignJWT({ purpose: PURPOSE, partnerId: staff.partnerId, staffId: staff.id, employeeId, version: fingerprint(staff.passwordHash) })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(key());
  cookies().set(EMPLOYEE_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 28800 });
}

export async function loginEmployee(partnerId: string, loginId: string, password: string): Promise<boolean> {
  if (loginId.length > 100 || password.length > 256 || !loginId.startsWith("HRE-")) return false;
  await assertModuleAccess(partnerId, "hrms");
  // Unknown identifiers do not allocate throttle rows. Known accounts get a
  // cross-process, transaction-locked five-attempt/15-minute throttle.
  const account = await prisma.partnerStaff.findFirst({ where: { partnerId, loginId, role: ROLE, status: "Active" } });
  if (!account) return false;
  const authenticated = await withRecordLock("hrms-employee-login", account.id, async () => {
    const staff = await prisma.partnerStaff.findFirst({ where: { id: account.id, partnerId, role: ROLE, status: "Active" } });
    if (!staff) return null;
    const employeeId = loginId.slice(4);
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, partnerId, status: "Active" } });
    if (!employee) return null;
    const where = { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "hrms-login-attempts", recordKey: staff.id } };
    const row = await prisma.businessRecord.findUnique({ where });
    const stored = (row?.data ?? {}) as { count?: number; until?: number };
    const now = Date.now();
    const count = Number(stored.until) > now ? Number(stored.count) || 0 : 0;
    if (count >= 5) return null;
    const valid = verifyPassword(password, staff.passwordHash);
    const data = valid ? { count: 0, until: 0 } : { count: count + 1, until: count ? Number(stored.until) : now + 900000 };
    await prisma.businessRecord.upsert({ where, create: { ...where.partnerId_moduleSlug_recordKey, data }, update: { data } });
    return valid ? { staff, employeeId } : null;
  });
  if (!authenticated) return false;
  await setSession(authenticated.staff, authenticated.employeeId);
  return true;
}

export async function getEmployeeSession(partnerId: string, allowTemporaryPassword = false) {
  try {
    const token = cookies().get(EMPLOYEE_COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (payload.purpose !== PURPOSE || payload.partnerId !== partnerId || typeof payload.staffId !== "string" || typeof payload.employeeId !== "string") return null;
    await assertModuleAccess(partnerId, "hrms");
    const [staff, employee] = await Promise.all([
      prisma.partnerStaff.findFirst({ where: { id: payload.staffId, partnerId, role: ROLE, status: "Active", loginId: employeeLoginId(payload.employeeId) } }),
      prisma.employee.findFirst({ where: { id: payload.employeeId, partnerId, status: "Active" }, select: { id: true, name: true } }),
    ]);
    if (!staff || !employee || payload.version !== fingerprint(staff.passwordHash) || (!allowTemporaryPassword && staff.mustChangePassword)) return null;
    return { employee, staffId: staff.id, mustChangePassword: staff.mustChangePassword };
  } catch { return null; }
}

export async function changeEmployeePassword(partnerId: string, password: string, confirmation: string) {
  const session = await getEmployeeSession(partnerId, true);
  if (!session) throw new Error("Please sign in again.");
  if (password.length < 12 || password.length > 128 || password !== confirmation) throw new Error("Use matching passwords between 12 and 128 characters.");
  const staff = await withRecordLock("hrms-employee-access", `${partnerId}:${session.employee.id}`, async () => {
    const current = await getEmployeeSession(partnerId, true);
    if (!current) throw new Error("Please sign in again.");
    const existing = await prisma.partnerStaff.findFirst({ where: { id: current.staffId, partnerId } });
    if (!existing || verifyPassword(password, existing.passwordHash)) throw new Error("Choose a new password different from your current password.");
    return prisma.partnerStaff.update({ where: { id: current.staffId }, data: { passwordHash: hashPassword(password), mustChangePassword: false } });
  });
  await setSession(staff, session.employee.id);
}
