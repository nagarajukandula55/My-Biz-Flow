"use server";

/**
 * "Forgot my Partner ID / password" flow surfaced from the public ANu
 * widget (PublicHelpBubble.tsx). Distinct from requestPasswordReset
 * (actions.ts) which only takes an identifier already known to be a login
 * field (id/loginContact/businessEmail) and only emails a reset link —
 * this instead accepts GST No. or registered email specifically, and on a
 * match:
 *   1. Pushes the Partner ID + a fresh reset link to the partner's
 *      connected Telegram (personal chat if connected, else the group
 *      chat) via the same TelegramSettings this app already uses for
 *      alerts — so someone locked out of email can still recover via
 *      Telegram.
 *   2. Emails the existing JWT-based password-reset link (same
 *      createPasswordResetToken flow requestPasswordReset uses) to
 *      businessEmail regardless.
 *
 * Always returns the same generic response whether or not a match was
 * found — same anti-enumeration convention as requestPasswordReset.
 */
import { findPartnerForIdRecovery } from "@/lib/partnerData";
import { createPasswordResetToken } from "@/lib/partnerSession";
import { sendPasswordResetEmail } from "@/lib/email";
import { getTelegramSettings, sendRawTelegramMessage } from "@/lib/telegram";
import { SITE_URL } from "@/lib/seo";

export async function requestPartnerIdRecovery(formData: FormData): Promise<{ ok: true }> {
  const identifier = String(formData.get("identifier") ?? "").trim();

  if (identifier) {
    const partner = await findPartnerForIdRecovery(identifier);
    if (partner) {
      const token = await createPasswordResetToken(partner.id);
      const resetUrl = `${SITE_URL}/reset-password?token=${encodeURIComponent(token)}`;

      await sendPasswordResetEmail({ to: partner.businessEmail, resetUrl });

      const settings = await getTelegramSettings(partner.id);
      const telegramChatId = settings.chatId || settings.groupChatId;
      if (telegramChatId) {
        const message = `Account recovery requested for ${partner.businessName}\n\nYour Partner ID: ${partner.id}\n\nReset your password: ${resetUrl}\n\nIf you didn't request this, you can ignore it — your password won't change unless the link above is used.`;
        try {
          await sendRawTelegramMessage(telegramChatId, message);
        } catch {
          // best-effort — the email above is the guaranteed delivery path
        }
      }
    }
  }

  return { ok: true };
}
