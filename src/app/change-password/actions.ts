"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PARTNER_SESSION_COOKIE } from "@/lib/partnerSession";
import { setPartnerPassword } from "@/lib/partnerData";

export async function changePasswordAction(formData: FormData) {
  const partnerId = cookies().get(PARTNER_SESSION_COOKIE)?.value;
  if (!partnerId) redirect("/login");

  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 8) {
    redirect("/change-password?error=too_short");
  }
  if (newPassword !== confirmPassword) {
    redirect("/change-password?error=mismatch");
  }

  await setPartnerPassword(partnerId, newPassword);
  redirect(`/partner/${partnerId}/dashboard`);
}
