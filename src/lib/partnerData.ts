/**
 * Real Partner accounts — Prisma-backed (`Partner` table). Public id is
 * "<prefix>####" (login id, shown on invoices, all partner-facing surfaces),
 * where <prefix> comes from the Partner's own PartnerType.idPrefix (defaults
 * to "VND" for every type that doesn't set one; the Service Centre type
 * uses "SC"). Each distinct prefix has its own independent sequence — see
 * nextPartnerId() below. internalKey ("BIZ002-<id>") is for our own DB
 * relations and the eventual central-api sync only — never shown to the
 * partner. businessId fixed to "BIZ002" until real cross-business support
 * exists.
 */
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
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

/**
 * Computes the next sequential "<prefix>####" Partner id for the given
 * partnerTypeId, inside the same transaction as the Partner insert (so two
 * concurrent signups against the same or different prefixes never race).
 * Each prefix (from PartnerType.idPrefix, default "VND") gets its own
 * independent sequence — counted only over existing partners whose id
 * already starts with that same prefix, so e.g. VND and SC sequences never
 * share or skip numbers because of each other.
 */
async function nextPartnerId(tx: Prisma.TransactionClient, partnerTypeId: string): Promise<string> {
  const partnerType = await tx.partnerType.findUnique({ where: { id: partnerTypeId } });
  const prefix = partnerType?.idPrefix || "VND";
  const count = await tx.partner.count({ where: { id: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
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
 * Creates a Partner with the next sequential <prefix>#### id (inside a
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
    const id = await nextPartnerId(tx, input.partnerTypeId);
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
    const id = await nextPartnerId(tx, request.partnerTypeId);
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

/** Looks a partner up by their public <prefix>#### id OR their registered login contact number — never the internal key. */
export async function findPartnerByLoginIdentifier(identifier: string): Promise<PartnerRecord | undefined> {
  const trimmed = identifier.trim();
  const row = await prisma.partner.findFirst({
    where: { OR: [{ id: trimmed }, { loginContact: trimmed }] },
  });
  return row ? toRecord(row) : undefined;
}

/**
 * Looks a partner up for a password-reset request: by their public
 * <prefix>#### id, their registered login contact number, OR their
 * registered business email — whichever one the person typed into
 * "forgot password". Deliberately broader than findPartnerByLoginIdentifier
 * (which only checks id/loginContact, since that's all the login form
 * asks for) because the forgot-password form asks for "the email on your
 * account", and businessEmail is where the reset link itself gets sent
 * regardless of which field matched.
 */
export async function findPartnerForPasswordReset(identifier: string): Promise<PartnerRecord | undefined> {
  const trimmed = identifier.trim();
  if (!trimmed) return undefined;
  const row = await prisma.partner.findFirst({
    where: { OR: [{ id: trimmed }, { loginContact: trimmed }, { businessEmail: trimmed }] },
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
