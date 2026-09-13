"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { STAFF_SESSION_COOKIE, verifyStaffSessionToken } from "@/lib/partnerSession";
import { setPartnerStaffPassword } from "@/lib/partnerStaff";

export async function changeStaffPasswordAction(partnerId: string, formData: FormData) {
  const claims = await verifyStaffSessionToken(cookies().get(STAFF_SESSION_COOKIE)?.value);
  if (!claims || claims.partnerId !== partnerId) redirect(`/partner/${partnerId}/service-centre/staff-login`);

  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 8) {
    redirect(`/partner/${partnerId}/service-centre/staff-change-password?error=too_short`);
  }
  if (newPassword !== confirmPassword) {
    redirect(`/partner/${partnerId}/service-centre/staff-change-password?error=mismatch`);
  }

  await setPartnerStaffPassword(partnerId, claims.staffId, newPassword);
  redirect(`/partner/${partnerId}/service-centre`);
}
