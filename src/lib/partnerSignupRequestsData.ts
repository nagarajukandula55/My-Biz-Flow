/**
 * Signup requests held for Super Admin approval — created instead of a
 * Partner row when the chosen Partner Type has requiresApproval=true (see
 * PartnerType in prisma/schema.prisma). No VND#### id exists until
 * approved; approving converts the request into a real Partner via
 * createPartnerFromRequest().
 */
import { prisma } from "@/lib/prisma";
import { hashPassword, generatePassword } from "@/lib/passwords";
import { createPartnerFromRequest, type PartnerRecord } from "@/lib/partnerData";

export type SignupRequestRecord = {
  id: string;
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
  status: string;
  createdAt: Date;
};

function toRecord(row: {
  id: string;
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
  status: string;
  createdAt: Date;
}): SignupRequestRecord {
  return { ...row, addressLine: row.addressLine ?? "" };
}

export type SignupRequestInput = {
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

/** Creates a pending signup request with a freshly generated password (hashed immediately, same as a direct Partner signup). */
export async function createSignupRequest(input: SignupRequestInput): Promise<{ requestId: string; password: string }> {
  const password = generatePassword();
  const row = await prisma.partnerSignupRequest.create({
    data: {
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
      passwordHash: hashPassword(password),
    },
  });
  return { requestId: row.id, password };
}

export async function listPendingSignupRequests(): Promise<SignupRequestRecord[]> {
  const rows = await prisma.partnerSignupRequest.findMany({
    where: { status: "Pending" },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toRecord);
}

/** Approves a request: creates the real Partner (assigns VND#### now) and marks the request Approved. */
export async function approveSignupRequest(requestId: string): Promise<PartnerRecord> {
  const request = await prisma.partnerSignupRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("Signup request not found");

  const partner = await createPartnerFromRequest({
    partnerTypeId: request.partnerTypeId,
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

  await prisma.partnerSignupRequest.update({ where: { id: requestId }, data: { status: "Approved" } });
  return partner;
}

/** Rejects a request and returns its record — the caller uses businessEmail/
 * businessName to send sendPartnerRejectedEmail (src/lib/email/partnerEmails.ts). */
export async function rejectSignupRequest(requestId: string): Promise<SignupRequestRecord> {
  const row = await prisma.partnerSignupRequest.update({ where: { id: requestId }, data: { status: "Rejected" } });
  return toRecord(row);
}
