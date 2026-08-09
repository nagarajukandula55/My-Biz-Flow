/**
 * Real Vendor accounts — Prisma-backed (`Vendor` table). Public id is
 * "VND####" (login id, shown on invoices, all vendor-facing surfaces).
 * internalKey ("BIZ002-VND####") is for our own DB relations and the
 * eventual central-api sync only — never shown to the vendor. businessId
 * fixed to "BIZ002" until real cross-business support exists.
 */
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, generatePassword } from "@/lib/passwords";
import { createBusinessRecord } from "@/lib/businessRecords";
import { getVendorType } from "@/lib/designer/vendorTypesData";

const BUSINESS_ID = "BIZ002";

export type VendorRecord = {
  id: string;
  internalKey: string;
  businessId: string;
  vendorTypeId: string;
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
  vendorTypeId: string;
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
}): VendorRecord {
  return { ...row, addressLine: row.addressLine ?? "" };
}

/**
 * Auto role assignment: the first team member ("Owner") on a freshly
 * created Vendor account, given the Role its chosen Vendor Type puts
 * first in assignableRoleIds (falling back to "Owner / Admin" if that
 * type has no Roles configured yet). Persisted as a real Users
 * BusinessRecord, same as any team member added later from
 * /vendor/[vendorId]/admin/users.
 */
async function assignOwnerRole(vendor: VendorRecord): Promise<void> {
  const vendorType = await getVendorType(vendor.vendorTypeId);
  const roleId = vendorType?.assignableRoleIds[0] ?? "Owner / Admin";
  await createBusinessRecord(vendor.id, "users", {
    id: "Owner",
    email: vendor.businessEmail,
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

export type VendorSignupInput = {
  vendorTypeId: string;
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
 * Creates a Vendor with the next sequential VND#### id (inside a
 * transaction to avoid two signups racing to the same number) and a
 * freshly generated password — signup never collects a password
 * directly, see /signup. Returns the plaintext password ONCE, for the
 * success page / welcome email to show; it is never stored or
 * retrievable again after this call returns.
 */
export async function createVendor(input: VendorSignupInput): Promise<{ vendor: VendorRecord; password: string }> {
  const password = generatePassword();
  const passwordHash = hashPassword(password);

  const vendor = await prisma.$transaction(async (tx) => {
    const count = await tx.vendor.count();
    const id = `VND${String(count + 1).padStart(4, "0")}`;
    const internalKey = `${BUSINESS_ID}-${id}`;
    const row = await tx.vendor.create({
      data: {
        id,
        internalKey,
        businessId: BUSINESS_ID,
        vendorTypeId: input.vendorTypeId,
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

  await assignOwnerRole(vendor);
  return { vendor, password };
}

/** Creates a Vendor from an already-approved VendorSignupRequest, reusing its already-hashed password. */
export async function createVendorFromRequest(request: {
  vendorTypeId: string;
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
}): Promise<VendorRecord> {
  const vendor = await prisma.$transaction(async (tx) => {
    const count = await tx.vendor.count();
    const id = `VND${String(count + 1).padStart(4, "0")}`;
    const internalKey = `${BUSINESS_ID}-${id}`;
    const row = await tx.vendor.create({
      data: {
        id,
        internalKey,
        businessId: BUSINESS_ID,
        vendorTypeId: request.vendorTypeId,
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

  await assignOwnerRole(vendor);
  return vendor;
}

/** Looks a vendor up by their public VND#### id OR their registered login contact number — never the internal key. */
export async function findVendorByLoginIdentifier(identifier: string): Promise<VendorRecord | undefined> {
  const trimmed = identifier.trim();
  const row = await prisma.vendor.findFirst({
    where: { OR: [{ id: trimmed }, { loginContact: trimmed }] },
  });
  return row ? toRecord(row) : undefined;
}

export async function verifyVendorPassword(vendorId: string, password: string): Promise<boolean> {
  const row = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!row) return false;
  return verifyPassword(password, row.passwordHash);
}

/** Sets a new password and clears the forced-change flag — used by the post-login "change your password" step. */
export async function setVendorPassword(vendorId: string, newPassword: string): Promise<void> {
  await prisma.vendor.update({
    where: { id: vendorId },
    data: { passwordHash: hashPassword(newPassword), mustChangePassword: false },
  });
}

export async function getVendor(id: string): Promise<VendorRecord | undefined> {
  const row = await prisma.vendor.findUnique({ where: { id } });
  return row ? toRecord(row) : undefined;
}

export async function listVendors(): Promise<VendorRecord[]> {
  const rows = await prisma.vendor.findMany({ orderBy: { id: "asc" } });
  return rows.map(toRecord);
}

export async function deleteAllVendors(): Promise<number> {
  const { count } = await prisma.vendor.deleteMany({});
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

/** Super Admin override of a vendor's subscription — status, trial window, plan, cycle, offer. */
export async function updateVendorSubscription(id: string, data: SubscriptionUpdateInput): Promise<void> {
  await prisma.vendor.update({ where: { id }, data });
}
