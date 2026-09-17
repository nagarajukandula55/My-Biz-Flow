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
 *
 * This file holds the two original senders (password reset, partner
 * welcome) plus the shared low-level helpers (sendEmail/emailShell/
 * emailButton/emailInfoBox/SUPPORT_EMAIL). Every other occasion — workorder
 * lifecycle, invoice, partner-application, admin temp password, payment
 * confirmation — lives in src/lib/email/*.ts, split out once this file
 * would otherwise have grown past a screenful of unrelated templates
 * (matching how src/lib/fieldForce/ splits by concern once one file gets
 * large), importing these same shared helpers rather than duplicating them.
 */
import { Resend } from "resend";
import { env } from "@/lib/env";
import { SITE_NAME, SITE_URL, SUPPORT_EMAIL } from "@/lib/seo";
import { getEmailTemplate, renderEmailTemplate } from "@/lib/emailTemplatesData";

export { SUPPORT_EMAIL };

/**
 * Renders a template's {{token}}-filled body into html + a plain-text
 * fallback. In "text" mode (the default), \n\n-separated paragraphs become
 * <p> blocks and the text version is the same paragraphs joined. In "html"
 * mode the body is used verbatim as the html (an admin-authored fragment,
 * still token-filled) and the text version strips tags for the plain-text
 * part of the email.
 */
export function renderTemplateParagraphs(body: string, vars: Record<string, string>, format: "text" | "html" = "text"): { html: string; text: string } {
  const filled = renderEmailTemplate(body, vars);
  if (format === "html") {
    return { html: filled, text: filled.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() };
  }
  const paragraphs = filled.split(/\n\n+/).filter(Boolean);
  return {
    html: paragraphs.map((p) => `<p style="margin:0 0 16px;">${p.replace(/\n/g, "<br/>")}</p>`).join(""),
    text: paragraphs.join("\n\n"),
  };
}

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
export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<{ sent: boolean }> {
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

export function emailShell(bodyHtml: string): string {
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

export function emailButton(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;">${label}</a>`;
}

/** Small key/value info box — matches AN-CRM's emailInfoBox() shape
 * (services/email/resend.service.ts), used by the workorder/invoice/
 * partner-application templates in src/lib/email/* for a compact detail
 * block (order/invoice numbers, temp passwords, amounts, etc.). */
export function emailInfoBox(rows: { label: string; value: string }[]): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#f9fafb;border-radius:8px;margin:0 0 20px;">
    ${rows
      .map(
        (r, i) =>
          `<tr><td style="padding:${i === 0 ? "14px" : "0"} 16px ${i === rows.length - 1 ? "14px" : "8px"};font-size:13px;color:#374151;"><strong>${r.label}:</strong> ${r.value}</td></tr>`
      )
      .join("")}
  </table>`;
}

/**
 * Password-reset link email — the equivalent of AN-CRM's FORGOT_PASSWORD
 * occasion (src/services/email/resend.service.ts's sendPasswordResetEmail
 * there), adapted for My Biz Flow's own branding. Subject/heading/body are
 * admin-editable (src/lib/emailTemplateDefs.ts key "password_reset").
 */
export async function sendPasswordResetEmail({ to, resetUrl }: { to: string; resetUrl: string }): Promise<{ sent: boolean }> {
  const tpl = await getEmailTemplate("password_reset");
  const vars = { siteName: SITE_NAME, supportEmail: SUPPORT_EMAIL };
  const subject = renderEmailTemplate(tpl.subject, vars);
  const heading = renderEmailTemplate(tpl.heading, vars);
  const { html: bodyHtml, text: bodyText } = renderTemplateParagraphs(tpl.body, vars, tpl.bodyFormat);
  const html = emailShell(`
    <h1 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 12px;">${heading}</h1>
    ${bodyHtml}
    <div style="text-align:center;margin:0 0 20px;">${emailButton("Reset password", resetUrl)}</div>
    <p style="margin:0;font-size:12px;color:#9ca3af;word-break:break-all;">Or paste this link into your browser: ${resetUrl}</p>
  `);
  const text = `${subject}\n\n${bodyText}\n\nReset link: ${resetUrl}\n\nNeed help? Contact ${SUPPORT_EMAIL}.`;

  return sendEmail({ to, subject, html, text });
}

/**
 * Platform subscription payment receipt — sent by My Biz Flow ITSELF to a
 * partner when their subscription payment is recorded (there is no live
 * payment gateway; a Super Admin marks a partner Active/records payment in
 * the Admin app's Subscribers editor, which calls this via
 * /api/admin/send-partner-email). Distinct from sendInvoiceEmail
 * (src/lib/email/partnerEmails.ts), which is a PARTNER's own invoice to
 * THEIR customer — this one is platform-to-partner billing, the only kind
 * of "invoice between My Biz Flow and a partner" this app sends.
 */
export async function sendPlatformSubscriptionPaymentEmail({
  to,
  businessName,
  planName,
  amount,
  billingCycle,
  invoiceNumber,
}: {
  to: string;
  businessName: string;
  planName: string;
  amount: string;
  billingCycle: string;
  invoiceNumber: string;
}): Promise<{ sent: boolean }> {
  const tpl = await getEmailTemplate("platform_subscription_payment");
  const vars = { siteName: SITE_NAME, supportEmail: SUPPORT_EMAIL, businessName, planName, amount, billingCycle, invoiceNumber };
  const subject = renderEmailTemplate(tpl.subject, vars);
  const heading = renderEmailTemplate(tpl.heading, vars);
  const { html: bodyHtml, text: bodyText } = renderTemplateParagraphs(tpl.body, vars, tpl.bodyFormat);
  const footNote = tpl.footNote ? renderEmailTemplate(tpl.footNote, vars) : "";
  const html = emailShell(`
    <h1 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 12px;">${heading}</h1>
    ${bodyHtml}
    ${emailInfoBox([
      { label: "Invoice number", value: invoiceNumber },
      { label: "Plan", value: planName },
      { label: "Billing cycle", value: billingCycle },
      { label: "Amount", value: amount },
    ])}
    ${footNote ? `<p style="margin:0;font-size:13px;color:#6b7280;">${footNote}</p>` : ""}
  `);
  const text = `${subject}\n\n${bodyText}\n\nInvoice number: ${invoiceNumber}\nPlan: ${planName}\nBilling cycle: ${billingCycle}\nAmount: ${amount}\n\n${footNote}`;

  return sendEmail({ to, subject, html, text });
}

/**
 * Partner welcome / signup-confirmation email — the equivalent of
 * AN-CRM's WELCOME_REGISTRATION occasion, adapted for My Biz Flow. Sent
 * once, right after a Partner account is created (see /signup's
 * createPartner() call). Carries the partner's public login id (their
 * Login ID for any future sign-in on another device) but, matching
 * AN-CRM's own WELCOME_REGISTRATION occasion, never the password itself —
 * the visitor is auto-signed-in straight into a forced "set your
 * password" screen right after registering (see signup/actions.ts), so
 * there's no temporary password to relay by email at all. Subject/heading/
 * body are admin-editable (key "partner_welcome").
 */
export async function sendPartnerWelcomeEmail({
  to,
  businessName,
  partnerId,
}: {
  to: string;
  businessName: string;
  partnerId: string;
}): Promise<{ sent: boolean }> {
  const loginUrl = `${SITE_URL}/login`;
  const tpl = await getEmailTemplate("partner_welcome");
  const vars = { siteName: SITE_NAME, businessName, partnerId };
  const subject = renderEmailTemplate(tpl.subject, vars);
  const heading = renderEmailTemplate(tpl.heading, vars);
  const { html: bodyHtml, text: bodyText } = renderTemplateParagraphs(tpl.body, vars, tpl.bodyFormat);
  const html = emailShell(`
    <h1 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 12px;">${heading}</h1>
    ${emailInfoBox([{ label: "Partner ID", value: partnerId }])}
    ${bodyHtml}
    <div style="text-align:center;margin:0 0 20px;">${emailButton("Sign in", loginUrl)}</div>
  `);
  const text = `${subject}\n\nPartner ID: ${partnerId}\n\n${bodyText}\n\nSign in: ${loginUrl}\n\nNeed help? Contact ${SUPPORT_EMAIL}.`;

  return sendEmail({ to, subject, html, text });
}
