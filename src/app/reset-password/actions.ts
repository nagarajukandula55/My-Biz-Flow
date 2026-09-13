"use server";

import { redirect } from "next/navigation";
import { verifyPasswordResetToken } from "@/lib/partnerSession";
import { setPartnerPassword } from "@/lib/partnerData";

/**
 * Consumes a password-reset token (from the emailed /reset-password?token=
 * link) and sets a new password. verifyPasswordResetToken checks the
 * signature, expiry, AND the `purpose: "password-reset"` claim, so a
 * partner-session cookie value can never be used here even if pasted in
 * by hand.
 */
export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const partnerId = await verifyPasswordResetToken(token);
  if (!partnerId) {
    redirect(`/reset-password?token=${encodeURIComponent(token)}&error=invalid_token`);
  }

  if (newPassword.length < 8) {
    redirect(`/reset-password?token=${encodeURIComponent(token)}&error=too_short`);
  }
  if (newPassword !== confirmPassword) {
    redirect(`/reset-password?token=${encodeURIComponent(token)}&error=mismatch`);
  }

  // setPartnerPassword also clears mustChangePassword — a partner who
  // resets their password this way has, by definition, already changed it
  // from whatever generated/forgotten one they started with.
  await setPartnerPassword(partnerId, newPassword);

  redirect("/login?reset=success");
}
