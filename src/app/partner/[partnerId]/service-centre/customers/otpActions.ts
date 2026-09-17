"use server";

import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { requestCustomerDataOtp, verifyCustomerDataOtp, lockCustomerData, type RequestOtpResult, type VerifyOtpResult } from "@/lib/customerDataAccess";

export async function requestCustomerDataOtpAction(partnerId: string): Promise<RequestOtpResult> {
  await requireSessionPartnerId(partnerId);
  return requestCustomerDataOtp(partnerId);
}

export async function verifyCustomerDataOtpAction(partnerId: string, code: string): Promise<VerifyOtpResult> {
  await requireSessionPartnerId(partnerId);
  const result = await verifyCustomerDataOtp(partnerId, code);
  if (result.verified) {
    revalidatePath(`/partner/${partnerId}/service-centre/customers`);
  }
  return result;
}

export async function lockCustomerDataAction(partnerId: string): Promise<void> {
  await requireSessionPartnerId(partnerId);
  await lockCustomerData(partnerId);
  revalidatePath(`/partner/${partnerId}/service-centre/customers`);
}
