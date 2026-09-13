"use server";

import { revalidatePath } from "next/cache";
import { approveSignupRequest, rejectSignupRequest } from "@/lib/partnerSignupRequestsData";
import { sendPartnerApprovedEmail, sendPartnerRejectedEmail } from "@/lib/email/partnerEmails";

export async function approveSignupRequestAction(requestId: string) {
  const partner = await approveSignupRequest(requestId);
  // Best-effort — sendPartnerApprovedEmail never throws — fire-and-forget
  // is fine here since there's no redirect() immediately after to race.
  sendPartnerApprovedEmail({ to: partner.businessEmail, businessName: partner.businessName, partnerId: partner.id }).catch(() => {});
  revalidatePath("/admin/partner-signups");
  return partner.id;
}

export async function rejectSignupRequestAction(requestId: string) {
  const request = await rejectSignupRequest(requestId);
  sendPartnerRejectedEmail({ to: request.businessEmail, businessName: request.businessName }).catch(() => {});
  revalidatePath("/admin/partner-signups");
}
