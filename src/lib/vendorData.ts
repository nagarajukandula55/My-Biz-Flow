/**
 * Real Vendor accounts — Prisma-backed (`Vendor` table). Public id is
 * "VND####" (login id, shown on invoices, all vendor-facing surfaces).
 * internalKey ("BIZ002-VND####") is for our own DB relations and the
 * eventual central-api sync only — never shown to the vendor. businessId
 * fixed to "BIZ002" until real cross-business support exists.
 */
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/passwords";

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
  status: string;
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
  status: string;
}): VendorRecord {
  return { ...row, addressLine: row.addressLine ?? "" };
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
  password: string;
};

/** Creates a Vendor with the next sequential VND#### id, inside a transaction to avoid two signups racing to the same number. */
export async function createVendor(input: VendorSignupInput): Promise<VendorRecord> {
  return prisma.$transaction(async (tx) => {
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
        passwordHash: hashPassword(input.password),
      },
    });
    return toRecord(row);
  });
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
