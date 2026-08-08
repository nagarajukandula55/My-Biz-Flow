/**
 * Signup requests held for Super Admin approval — created instead of a
 * Vendor row when the chosen Vendor Type has requiresApproval=true (see
 * VendorType in prisma/schema.prisma). No VND#### id exists until
 * approved; approving converts the request into a real Vendor via
 * createVendorFromRequest().
 */
import { prisma } from "@/lib/prisma";
import { hashPassword, generatePassword } from "@/lib/passwords";
import { createVendorFromRequest, type VendorRecord } from "@/lib/vendorData";

export type SignupRequestRecord = {
  id: string;
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
  createdAt: Date;
};

function toRecord(row: {
  id: string;
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
  createdAt: Date;
}): SignupRequestRecord {
  return { ...row, addressLine: row.addressLine ?? "" };
}

export type SignupRequestInput = {
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

/** Creates a pending signup request with a freshly generated password (hashed immediately, same as a direct Vendor signup). */
export async function createSignupRequest(input: SignupRequestInput): Promise<{ requestId: string; password: string }> {
  const password = generatePassword();
  const row = await prisma.vendorSignupRequest.create({
    data: {
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
      passwordHash: hashPassword(password),
    },
  });
  return { requestId: row.id, password };
}

export async function listPendingSignupRequests(): Promise<SignupRequestRecord[]> {
  const rows = await prisma.vendorSignupRequest.findMany({
    where: { status: "Pending" },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toRecord);
}

/** Approves a request: creates the real Vendor (assigns VND#### now) and marks the request Approved. */
export async function approveSignupRequest(requestId: string): Promise<VendorRecord> {
  const request = await prisma.vendorSignupRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("Signup request not found");

  const vendor = await createVendorFromRequest({
    vendorTypeId: request.vendorTypeId,
    businessName: request.businessName,
    addressLine: request.addressLine ?? "",
    city: request.city,
    state: request.state,
    pincode: request.pincode,
    gstin: request.gstin,
    businessEmail: request.businessEmail,
    businessContact: request.businessContact,
    loginContact: request.loginContact,
    passwordHash: request.passwordHash,
  });

  await prisma.vendorSignupRequest.update({ where: { id: requestId }, data: { status: "Approved" } });
  return vendor;
}

export async function rejectSignupRequest(requestId: string): Promise<void> {
  await prisma.vendorSignupRequest.update({ where: { id: requestId }, data: { status: "Rejected" } });
}
