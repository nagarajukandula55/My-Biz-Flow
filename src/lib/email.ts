/**
 * Transactional email — optional, graceful-degradation posture (same
 * pattern as src/lib/sms.ts and env.ts's razorpayKeyId()/smsApiKey()): if
 * RESEND_API_KEY/RESEND_FROM aren't set, every sender below logs the email
 * it *would* have sent and returns without throwing, so a partner can
 * still exercise the forgot-password flow end-to-end in local dev with no
 * Resend account configured. In production these env vars must be set
 * (Vercel project settings) for delivery to actually happen — see
 * env.ts's resendApiKey()/resendFrom() doc comment.
 *
 * Templates are plain functions returning { subject, html, text } rather
 * than a separate templates file/folder, matching this repo's existing
 * "one small module per concern" convention (src/lib/sms.ts) rather than
 * AN-CRM's heavier admin-editable EmailTemplate/occasions system, which
 * has no equivalent here yet.
 */
import { Resend } from "resend";
import { env } from "@/lib/env";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

const SUPPORT_EMAIL = "support@mybizflow.in";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/**
 * Low-level sender every template below goes through. Never throws — a
 * failed or unconfigured email send must never break the Server Action
 * that triggered it (matching sendSms()'s posture); callers that need to
 * know whether delivery actually happened can check the returned `sent`
 * flag, but none of the flows here treat `sent: false` as a hard failure.
 */
async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<{ sent: boolean }> {
  const apiKey = env.resendApiKey();
  const from = env.resendFrom();

  if (!apiKey || !from) {
    console.log(
      `[email:not-configured] RESEND_API_KEY/RESEND_FROM not set — would send "${subject}" to ${to}.\n` +
        `Set both in production (Vercel env vars) for real delivery. Preview:\n${text}`
    );
    return { sent: false };
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({ from, to, subject, html, text });
    return { sent: true };
  } catch (err) {
    // Best-effort: an email provider outage should never surface as a
    // 500 on a password-reset request or a signup.
    console.error("[email] send failed:", err);
    return { sent: false };
  }
}

function emailShell(bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:28px 32px 8px;">
                <span style="font-size:16px;font-weight:800;color:#111827;">${SITE_NAME}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 32px;color:#374151;font-size:14px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;">
                Need help? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#9ca3af;">${SUPPORT_EMAIL}</a>.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function emailButton(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;">${label}</a>`;
}

/**
 * Password-reset link email — the equivalent of AN-CRM's FORGOT_PASSWORD
 * occasion (src/services/email/resend.service.ts's sendPasswordResetEmail
 * there), adapted for My Biz Flow's own branding and kept deliberately
 * minimal (no admin-editable-template layer exists here yet).
 */
export async function sendPasswordResetEmail({ to, resetUrl }: { to: string; resetUrl: string }): Promise<{ sent: boolean }> {
  const subject = `Reset your ${SITE_NAME} password`;
  const html = emailShell(`
    <h1 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 12px;">Reset your password</h1>
    <p style="margin:0 0 20px;">We received a request to reset the password on your ${SITE_NAME} partner account.</p>
    <div style="text-align:center;margin:0 0 20px;">${emailButton("Reset password", resetUrl)}</div>
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">This link expires in 30 minutes. If you didn't request this, you can safely ignore this email — your password won't be changed.</p>
    <p style="margin:0;font-size:12px;color:#9ca3af;word-break:break-all;">Or paste this link into your browser: ${resetUrl}</p>
  `);
  const text = `Reset your ${SITE_NAME} password\n\nWe received a request to reset the password on your ${SITE_NAME} partner account.\n\nReset link (expires in 30 minutes): ${resetUrl}\n\nIf you didn't request this, you can safely ignore this email — your password won't be changed.\n\nNeed help? Contact ${SUPPORT_EMAIL}.`;

  return sendEmail({ to, subject, html, text });
}

/**
 * Partner welcome / signup-confirmation email — the equivalent of
 * AN-CRM's WELCOME_REGISTRATION occasion, adapted for My Biz Flow. Sent
 * once, right after a Partner account is created (see /signup's
 * createPartner() call), carrying the partner's public login id and the
 * one-time generated password so they can sign in without a support call.
 */
export async function sendPartnerWelcomeEmail({
  to,
  businessName,
  partnerId,
  password,
}: {
  to: string;
  businessName: string;
  partnerId: string;
  password: string;
}): Promise<{ sent: boolean }> {
  const loginUrl = `${SITE_URL}/login`;
  const subject = `Welcome to ${SITE_NAME} — your account is ready`;
  const html = emailShell(`
    <h1 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 12px;">Welcome, ${businessName}</h1>
    <p style="margin:0 0 16px;">Your ${SITE_NAME} partner account has been created and is ready to use.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#f9fafb;border-radius:8px;margin:0 0 20px;">
      <tr><td style="padding:14px 16px;font-size:13px;color:#374151;"><strong>Partner ID:</strong> ${partnerId}</td></tr>
      <tr><td style="padding:0 16px 14px;font-size:13px;color:#374151;"><strong>Temporary password:</strong> ${password}</td></tr>
    </table>
    <div style="text-align:center;margin:0 0 20px;">${emailButton("Sign in", loginUrl)}</div>
    <p style="margin:0;font-size:13px;color:#6b7280;">You'll be asked to set your own password the first time you sign in.</p>
  `);
  const text = `Welcome to ${SITE_NAME}, ${businessName}!\n\nYour partner account is ready.\n\nPartner ID: ${partnerId}\nTemporary password: ${password}\n\nSign in: ${loginUrl}\n\nYou'll be asked to set your own password the first time you sign in.\n\nNeed help? Contact ${SUPPORT_EMAIL}.`;

  return sendEmail({ to, subject, html, text });
}
