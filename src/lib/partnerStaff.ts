/**
 * Real PartnerStaff accounts — Prisma-backed (`PartnerStaff` table). Gives a
 * Partner (Service Centre first) a way to onboard technicians/front-desk/
 * managers with their OWN login, instead of the whole team sharing the
 * single Partner account (which is all that existed before — see
 * src/lib/sample-data/users.ts's header comment). Scoped to one partnerId;
 * unique on (partnerId, email) so the same email can be staff at two
 * different partners without conflict, mirroring Field Force's Provider
 * uniqueness convention ([partnerId, phone]).
 */
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, generatePassword } from "@/lib/passwords";

/** Roles this first pass supports — a plain string enum, not AN-CRM's
 * full custom-role/permission-matrix system. "Owner" is reserved for the
 * Partner's own account context conceptually, but a staff row can also be
 * created with it if the business wants a second full-access login. */
export const PARTNER_STAFF_ROLES = ["Owner", "Manager", "Technician", "FrontDesk"] as const;
export type PartnerStaffRole = (typeof PARTNER_STAFF_ROLES)[number];

export type PartnerStaffRecord = {
  id: string;
  partnerId: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function toRecord(row: {
  id: string;
  partnerId: string;
  name: string;
  email: string;
  phone: string | null;
  passwordHash: string;
  role: string;
  status: string;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PartnerStaffRecord {
  const { passwordHash: _passwordHash, ...rest } = row;
  return rest;
}

export async function listPartnerStaff(partnerId: string): Promise<PartnerStaffRecord[]> {
  const rows = await prisma.partnerStaff.findMany({ where: { partnerId }, orderBy: { createdAt: "asc" } });
  return rows.map(toRecord);
}

/** Active staff only — for assignment dropdowns (e.g. Service Centre technician picker). */
export async function listActivePartnerStaff(partnerId: string, role?: string): Promise<PartnerStaffRecord[]> {
  const rows = await prisma.partnerStaff.findMany({
    where: { partnerId, status: "Active", ...(role ? { role } : {}) },
    orderBy: { name: "asc" },
  });
  return rows.map(toRecord);
}

export async function getPartnerStaff(partnerId: string, staffId: string): Promise<PartnerStaffRecord | undefined> {
  const row = await prisma.partnerStaff.findFirst({ where: { id: staffId, partnerId } });
  return row ? toRecord(row) : undefined;
}

export type CreatePartnerStaffInput = {
  partnerId: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
};

/** Creates a staff account with a freshly generated password (shown once to the owner, never stored/retrievable again). */
export async function createPartnerStaff(
  input: CreatePartnerStaffInput
): Promise<{ staff: PartnerStaffRecord; password: string }> {
  const password = generatePassword();
  const passwordHash = hashPassword(password);
  const row = await prisma.partnerStaff.create({
    data: {
      partnerId: input.partnerId,
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      passwordHash,
      role: input.role,
    },
  });
  return { staff: toRecord(row), password };
}

export type UpdatePartnerStaffInput = {
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
};

export async function updatePartnerStaff(
  partnerId: string,
  staffId: string,
  input: UpdatePartnerStaffInput
): Promise<void> {
  await prisma.partnerStaff.updateMany({
    where: { id: staffId, partnerId },
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      role: input.role,
      status: input.status,
    },
  });
}

/** Resets a staff member's password to a freshly generated one and forces a change on next login. Returns the plaintext once. */
export async function resetPartnerStaffPassword(partnerId: string, staffId: string): Promise<string | undefined> {
  const existing = await getPartnerStaff(partnerId, staffId);
  if (!existing) return undefined;
  const password = generatePassword();
  await prisma.partnerStaff.updateMany({
    where: { id: staffId, partnerId },
    data: { passwordHash: hashPassword(password), mustChangePassword: true },
  });
  return password;
}

export async function setPartnerStaffPassword(partnerId: string, staffId: string, newPassword: string): Promise<void> {
  await prisma.partnerStaff.updateMany({
    where: { id: staffId, partnerId },
    data: { passwordHash: hashPassword(newPassword), mustChangePassword: false },
  });
}

/** Looks a staff member up by (partnerId, email) for login — never across partners. */
export async function findPartnerStaffByEmail(
  partnerId: string,
  email: string
): Promise<PartnerStaffRecord | undefined> {
  const row = await prisma.partnerStaff.findFirst({ where: { partnerId, email: email.trim() } });
  return row ? toRecord(row) : undefined;
}

export async function verifyPartnerStaffPassword(partnerId: string, staffId: string, password: string): Promise<boolean> {
  const row = await prisma.partnerStaff.findFirst({ where: { id: staffId, partnerId } });
  if (!row) return false;
  return verifyPassword(password, row.passwordHash);
}
