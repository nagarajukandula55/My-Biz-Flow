"use server";

import { revalidatePath } from "next/cache";
import { approveSignupRequest, rejectSignupRequest } from "@/lib/partnerSignupRequestsData";

export async function approveSignupRequestAction(requestId: string) {
  const partner = await approveSignupRequest(requestId);
  revalidatePath("/admin/partner-signups");
  return partner.id;
}

export async function rejectSignupRequestAction(requestId: string) {
  await rejectSignupRequest(requestId);
  revalidatePath("/admin/partner-signups");
}
