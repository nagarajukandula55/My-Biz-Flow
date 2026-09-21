"use server";

import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import {
  requestWorkorderReopenOtp,
  verifyWorkorderReopenOtp,
  type RequestReopenOtpResult,
  type VerifyReopenOtpResult,
} from "@/lib/workorderReopenAccess";

export async function requestWorkorderReopenOtpAction(
  partnerId: string,
  workorderId: string,
  workorderLabel: string
): Promise<RequestReopenOtpResult> {
  await requireSessionPartnerId(partnerId);
  return requestWorkorderReopenOtp(partnerId, workorderId, workorderLabel);
}

export async function verifyWorkorderReopenOtpAction(
  partnerId: string,
  workorderId: string,
  code: string
): Promise<VerifyReopenOtpResult> {
  await requireSessionPartnerId(partnerId);
  const result = await verifyWorkorderReopenOtp(workorderId, code);
  if (result.verified) {
    revalidatePath(`/partner/${partnerId}/service-centre/${workorderId}`);
  }
  return result;
}
