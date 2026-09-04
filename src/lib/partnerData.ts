/**
 * Real Partner accounts — Prisma-backed (`Partner` table). Public id is
 * "VND####" (login id, shown on invoices, all partner-facing surfaces).
 * internalKey ("BIZ002-VND####") is for our own DB relations and the
 * eventual central-api sync only — never shown to the partner. businessId
 * fixed to "BIZ002" until real cross-business support exists.
 */
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, generatePassword } from "@/lib/passwords";
import { createBusinessRecord } from "@/lib/businessRecords";
import { getPartnerType } from "@/lib/designer/partnerTypesData";

const BUSINESS_ID = "BIZ002";

export type PartnerRecord = {
  id: string;
  internalKey: string;
  businessId: string;
  partnerTypeId: string;
  businessName: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string | null;
  businessEmail: string;
  businessContact: string;
  loginContact: string;
  mustChangePassword: boolean;
  status: string;
  subscriptionStatus: string;
  trialStartAt: Date | null;
  trialEndAt: Date | null;
  billingCycle: string | null;
  planId: string | null;
  offerId: string | null;
  createdAt: Date;
};

function toRecord(row: {
  id: string;
  internalKey: string;
  businessId: string;
  partnerTypeId: string;
  businessName: string;
  addressLine: string | null;
  city: string;
  state: string;
  pincode: string;
  gstin: string | null;
  businessEmail: string;
  businessContact: string;
  loginContact: string;
  mustChangePassword: boolean;
  status: string;
  subscriptionStatus: string;
  trialStartAt: Date | null;
  trialEndAt: Date | null;
  billingCycle: string | null;
  planId: string | null;
  offerId: string | null;
  createdAt: Date;
}): PartnerRecord {
  return { ...row, addressLine: row.addressLine ?? "" };
}

/**
 * Auto role assignment: the first team member ("Owner") on a freshly
 * created Partner account, given the Role its chosen Partner Type puts
 * first in assignableRoleIds (falling back to "Owner / Admin" if that
 * type has no Roles configured yet). Persisted as a real Users
 * BusinessRecord, same as any team member added later from
 * /partner/[partnerId]/admin/users.
 */
async function assignOwnerRole(partner: PartnerRecord): Promise<void> {
  const partnerType = await getPartnerType(partner.partnerTypeId);
  const roleId = partnerType?.assignableRoleIds[0] ?? "Owner / Admin";
  await createBusinessRecord(partner.id, "users", {
    id: "Owner",
    email: partner.businessEmail,
    role: roleId,
    status: "Active",
    lastLogin: "",
  });
}

const TRIAL_DAYS = 7;

function trialDates(): { trialStartAt: Date; trialEndAt: Date } {
  const trialStartAt = new Date();
  const trialEndAt = new Date(trialStartAt);
  trialEndAt.setDate(trialEndAt.getDate() + TRIAL_DAYS);
  return { trialStartAt, trialEndAt };
}

export type PartnerSignupInput = {
  partnerTypeId: string;
  businessName: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  businessEmail: string;
  businessContact: string;
  loginContact: string;
};

/**
 * Creates a Partner with the next sequential VND#### id (inside a
 * transaction to avoid two signups racing to the same number) and a
 * freshly generated password — signup never collects a password
 * directly, see /signup. Returns the plaintext password ONCE, for the
 * success page / welcome email to show; it is never stored or
 * retrievable again after this call returns.
 */
export async function createPartner(input: PartnerSignupInput): Promise<{ partner: PartnerRecord; password: string }> {
  const password = generatePassword();
  const passwordHash = hashPassword(password);

  const partner = await prisma.$transaction(async (tx) => {
    const count = await tx.partner.count();
    const id = `VND${String(count + 1).padStart(4, "0")}`;
    const internalKey = `${BUSINESS_ID}-${id}`;
    const row = await tx.partner.create({
      data: {
        id,
        internalKey,
        businessId: BUSINESS_ID,
        partnerTypeId: input.partnerTypeId,
        businessName: input.businessName,
        addressLine: input.addressLine,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        gstin: input.gstin || null,
        businessEmail: input.businessEmail,
        businessContact: input.businessContact,
        loginContact: input.loginContact,
        passwordHash,
        ...trialDates(),
      },
    });
    return toRecord(row);
  });

  await assignOwnerRole(partner);
  return { partner, password };
}

/** Creates a Partner from an already-approved PartnerSignupRequest, reusing its already-hashed password. */
export async function createPartnerFromRequest(request: {
  partnerTypeId: string;
  businessName: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string | null;
  businessEmail: string;
  businessContact: string;
  loginContact: string;
  passwordHash: string;
}): Promise<PartnerRecord> {
  const partner = await prisma.$transaction(async (tx) => {
    const count = await tx.partner.count();
    const id = `VND${String(count + 1).padStart(4, "0")}`;
    const internalKey = `${BUSINESS_ID}-${id}`;
    const row = await tx.partner.create({
      data: {
        id,
        internalKey,
        businessId: BUSINESS_ID,
        partnerTypeId: request.partnerTypeId,
        businessName: request.businessName,
        addressLine: request.addressLine,
        city: request.city,
        state: request.state,
        pincode: request.pincode,
        gstin: request.gstin,
        businessEmail: request.businessEmail,
        businessContact: request.businessContact,
        loginContact: request.loginContact,
        passwordHash: request.passwordHash,
        ...trialDates(),
      },
    });
    return toRecord(row);
  });

  await assignOwnerRole(partner);
  return partner;
}

/** Looks a partner up by their public VND#### id OR their registered login contact number — never the internal key. */
export async function findPartnerByLoginIdentifier(identifier: string): Promise<PartnerRecord | undefined> {
  const trimmed = identifier.trim();
  const row = await prisma.partner.findFirst({
    where: { OR: [{ id: trimmed }, { loginContact: trimmed }] },
  });
  return row ? toRecord(row) : undefined;
}

export async function verifyPartnerPassword(partnerId: string, password: string): Promise<boolean> {
  const row = await prisma.partner.findUnique({ where: { id: partnerId } });
  if (!row) return false;
  return verifyPassword(password, row.passwordHash);
}

/** Sets a new password and clears the forced-change flag — used by the post-login "change your password" step. */
export async function setPartnerPassword(partnerId: string, newPassword: string): Promise<void> {
  await prisma.partner.update({
    where: { id: partnerId },
    data: { passwordHash: hashPassword(newPassword), mustChangePassword: false },
  });
}

export async function getPartner(id: string): Promise<PartnerRecord | undefined> {
  const row = await prisma.partner.findUnique({ where: { id } });
  return row ? toRecord(row) : undefined;
}

export async function listPartners(): Promise<PartnerRecord[]> {
  const rows = await prisma.partner.findMany({ orderBy: { id: "asc" } });
  return rows.map(toRecord);
}

export async function deleteAllPartners(): Promise<number> {
  const { count } = await prisma.partner.deleteMany({});
  return count;
}

export type SubscriptionUpdateInput = {
  subscriptionStatus: string;
  trialStartAt: Date | null;
  trialEndAt: Date | null;
  billingCycle: string | null;
  planId: string | null;
  offerId: string | null;
};

/** Super Admin override of a partner's subscription — status, trial window, plan, cycle, offer. */
export async function updatePartnerSubscription(id: string, data: SubscriptionUpdateInput): Promise<void> {
  await prisma.partner.update({ where: { id }, data });
}
