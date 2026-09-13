"use server";

/**
 * Real password-reset request. Replaces the earlier demo stub that just
 * console.log'd the email and returned {ok:true} with no way to actually
 * reset anything.
 *
 * Always returns the same generic response regardless of whether the
 * identifier matches a real Partner — never reveal account existence to
 * an unauthenticated caller (AN-CRM's own /forgot-password already gets
 * this right; this mirrors that, not the leaky anti-pattern the task
 * warned about). The token is a short-lived (30 min), single-purpose JWT
 * (see createPasswordResetToken in partnerSession.ts) signed with the same
 * PARTNER_SESSION_SECRET as the login session cookie, but its distinct
 * `purpose: "password-reset"` claim means it can never be replayed as a
 * session cookie and vice versa.
 */
import { findPartnerForPasswordReset } from "@/lib/partnerData";
import { createPasswordResetToken } from "@/lib/partnerSession";
import { sendPasswordResetEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/seo";

export async function requestPasswordReset(formData: FormData) {
  const identifier = String(formData.get("email") ?? "").trim();

  if (identifier) {
    const partner = await findPartnerForPasswordReset(identifier);
    if (partner) {
      const token = await createPasswordResetToken(partner.id);
      const resetUrl = `${SITE_URL}/reset-password?token=${encodeURIComponent(token)}`;
      await sendPasswordResetEmail({ to: partner.businessEmail, resetUrl });
    }
  }

  // Same response whether or not an account was found/matched.
  return { ok: true };
}
