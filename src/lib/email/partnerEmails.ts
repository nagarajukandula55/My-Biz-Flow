/**
 * Partner-application, invoicing, admin-credential, and payment emails —
 * the remaining transactional-email occasions AN-CRM sends besides
 * password-reset and self-signup welcome (already in src/lib/email.ts) and
 * the Service Centre workorder lifecycle (src/lib/email/workorderEmails.ts).
 * Adapted from AN-CRM's core/email/emailOccasions.ts catalog +
 * services/email/resend.service.ts (VENDOR_APPLICATION_RECEIVED/
 * VENDOR_APPROVED/VENDOR_REJECTED/ACCOUNT_CREDENTIALS/INVOICE_SENT) for My
 * Biz Flow's own branding — copy rewritten, not pasted verbatim. Agreement/
 * e-signature occasions (AGREEMENT_OTP/AGREEMENT_PARTIAL_SIGNED/
 * AGREEMENT_FULLY_EXECUTED) are explicitly out of scope and skipped.
 *
 * Wiring status (see this repo's src/lib/partnerSignupRequestsData.ts and
 * src/app/admin/(protected)/partner-signups/actions.ts):
 *   - sendPartnerApplicationReceivedEmail: WIRED — src/app/signup/actions.ts
 *     (registerBusiness) for the requiresApproval=true path.
 *   - sendPartnerApprovedEmail / sendPartnerRejectedEmail: WIRED —
 *     src/app/admin/(protected)/partner-signups/actions.ts.
 *   - sendAdminIssuedCredentialsEmail / sendInvoiceEmail /
 *     sendPaymentConfirmationEmail: TEMPLATE-READY, NOT WIRED — no existing
 *     Server Action creates an admin-issued login or emails an invoice/
 *     payment receipt yet, so there's no natural call site to wire into in
 *     this pass.
 */
import { sendEmail, emailShell, emailButton, emailInfoBox, renderTemplateParagraphs, SUPPORT_EMAIL } from "@/lib/email";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { getEmailTemplate, renderEmailTemplate } from "@/lib/emailTemplatesData";

/**
 * Confirms a partner application was submitted and is pending Super Admin
 * review — the equivalent of AN-CRM's VENDOR_APPLICATION_RECEIVED occasion.
 * Only relevant for Partner Types with requiresApproval=true (see
 * prisma/schema.prisma's PartnerType comments); most Partner Types activate
 * instantly and get sendPartnerWelcomeEmail (src/lib/email.ts) instead.
 */
export async function sendPartnerApplicationReceivedEmail({
  to,
  businessName,
}: {
  to: string;
  businessName: string;
}): Promise<{ sent: boolean }> {
  const tpl = await getEmailTemplate("partner_application_received");
  const vars = { siteName: SITE_NAME, businessName };
  const subject = renderEmailTemplate(tpl.subject, vars);
  const heading = renderEmailTemplate(tpl.heading, vars);
  const { html: bodyHtml, text: bodyText } = renderTemplateParagraphs(tpl.body, vars, tpl.bodyFormat);
  const html = emailShell(`
    <h1 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 12px;">${heading}</h1>
    ${bodyHtml}
  `);
  const text = `${subject}\n\n${bodyText}\n\nNeed help? Contact ${SUPPORT_EMAIL}.`;
  return sendEmail({ to, subject, html, text });
}

/** A partner application was approved — the equivalent of AN-CRM's VENDOR_APPROVED occasion. */
export async function sendPartnerApprovedEmail({
  to,
  businessName,
  partnerId,
}: {
  to: string;
  businessName: string;
  partnerId: string;
}): Promise<{ sent: boolean }> {
  const loginUrl = `${SITE_URL}/login`;
  const tpl = await getEmailTemplate("partner_approved");
  const vars = { siteName: SITE_NAME, businessName };
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

/** A partner application was rejected — the equivalent of AN-CRM's VENDOR_REJECTED occasion. */
export async function sendPartnerRejectedEmail({
  to,
  businessName,
  reason,
}: {
  to: string;
  businessName: string;
  reason?: string;
}): Promise<{ sent: boolean }> {
  const tpl = await getEmailTemplate("partner_rejected");
  const vars = { siteName: SITE_NAME, businessName, reason: reason ? ` Reason: ${reason}.` : "", supportEmail: SUPPORT_EMAIL };
  const subject = renderEmailTemplate(tpl.subject, vars);
  const heading = renderEmailTemplate(tpl.heading, vars);
  const { html: bodyHtml, text: bodyText } = renderTemplateParagraphs(tpl.body, vars, tpl.bodyFormat);
  const html = emailShell(`
    <h1 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 12px;">${heading}</h1>
    ${bodyHtml}
  `);
  const text = `${subject}\n\n${bodyText}`;
  return sendEmail({ to, subject, html, text });
}

/**
 * Admin-issued temporary password — distinct from sendPartnerWelcomeEmail
 * (self-signup): this is for when a Super Admin/staff member creates or
 * resets a login FOR someone else, the equivalent of AN-CRM's
 * ACCOUNT_CREDENTIALS occasion. TEMPLATE-READY, NOT WIRED — see file header.
 */
export async function sendAdminIssuedCredentialsEmail({
  to,
  name,
  tempPassword,
}: {
  to: string;
  name: string;
  tempPassword: string;
}): Promise<{ sent: boolean }> {
  const loginUrl = `${SITE_URL}/login`;
  const tpl = await getEmailTemplate("admin_issued_credentials");
  const vars = { siteName: SITE_NAME, name };
  const subject = renderEmailTemplate(tpl.subject, vars);
  const heading = renderEmailTemplate(tpl.heading, vars);
  const { html: bodyHtml, text: bodyText } = renderTemplateParagraphs(tpl.body, vars, tpl.bodyFormat);
  const html = emailShell(`
    <h1 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 12px;">${heading}</h1>
    ${bodyHtml}
    ${emailInfoBox([
      { label: "Login email", value: to },
      { label: "Temporary password", value: tempPassword },
    ])}
    <div style="text-align:center;margin:0 0 20px;">${emailButton("Sign in", loginUrl)}</div>
  `);
  const text = `${subject}\n\n${bodyText}\n\nLogin email: ${to}\nTemporary password: ${tempPassword}\n\nSign in: ${loginUrl}\n\nNeed help? Contact ${SUPPORT_EMAIL}.`;
  return sendEmail({ to, subject, html, text });
}

/**
 * Invoice emailed to a partner's own customer — the equivalent of AN-CRM's
 * INVOICE_SENT occasion. TEMPLATE-READY, NOT WIRED — see file header.
 */
export async function sendInvoiceEmail({
  to,
  customerName,
  invoiceNumber,
  grandTotal,
  partnerBusinessName,
  pdfUrl,
}: {
  to: string;
  customerName: string;
  invoiceNumber: string;
  grandTotal: string;
  partnerBusinessName: string;
  pdfUrl?: string;
}): Promise<{ sent: boolean }> {
  const tpl = await getEmailTemplate("invoice_sent");
  const vars = { siteName: SITE_NAME, customerName, partnerBusinessName, invoiceNumber };
  const subject = renderEmailTemplate(tpl.subject, vars);
  const heading = renderEmailTemplate(tpl.heading, vars);
  const { html: bodyHtml, text: bodyText } = renderTemplateParagraphs(tpl.body, vars, tpl.bodyFormat);
  const footNote = tpl.footNote ? renderEmailTemplate(tpl.footNote, vars) : "";
  const html = emailShell(`
    <h1 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 12px;">${heading}</h1>
    ${bodyHtml}
    ${emailInfoBox([
      { label: "Invoice number", value: invoiceNumber },
      { label: "Amount", value: grandTotal },
    ])}
    ${pdfUrl ? `<div style="text-align:center;margin:0 0 20px;">${emailButton("View invoice", pdfUrl)}</div>` : ""}
    ${footNote ? `<p style="margin:0;font-size:13px;color:#6b7280;">${footNote}</p>` : ""}
  `);
  const text = `${subject}\n\n${bodyText}\n\nInvoice number: ${invoiceNumber}\nAmount: ${grandTotal}\n${pdfUrl ? `\nView invoice: ${pdfUrl}\n` : ""}\n${footNote}`;
  return sendEmail({ to, subject, html, text });
}

/**
 * Payment confirmation — sent once a payment against an invoice/order is
 * captured. No single named AN-CRM occasion (AN-CRM's PAYMENT_RECEIVED is a
 * Telegram/staff-facing alert type, see core/telegram/vendorMessageTypes.ts)
 * but it's the natural customer-facing counterpart, so it's included here.
 * TEMPLATE-READY, NOT WIRED — see file header.
 */
export async function sendPaymentConfirmationEmail({
  to,
  customerName,
  amount,
  invoiceNumber,
  partnerBusinessName,
}: {
  to: string;
  customerName: string;
  amount: string;
  invoiceNumber?: string;
  partnerBusinessName: string;
}): Promise<{ sent: boolean }> {
  const tpl = await getEmailTemplate("payment_confirmation");
  const vars = { siteName: SITE_NAME, customerName, partnerBusinessName };
  const subject = renderEmailTemplate(tpl.subject, vars);
  const heading = renderEmailTemplate(tpl.heading, vars);
  const { html: bodyHtml, text: bodyText } = renderTemplateParagraphs(tpl.body, vars, tpl.bodyFormat);
  const footNote = tpl.footNote ? renderEmailTemplate(tpl.footNote, vars) : "";
  const html = emailShell(`
    <h1 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 12px;">${heading}</h1>
    ${bodyHtml}
    ${emailInfoBox([
      { label: "Amount paid", value: amount },
      ...(invoiceNumber ? [{ label: "Invoice", value: invoiceNumber }] : []),
    ])}
    ${footNote ? `<p style="margin:0;font-size:13px;color:#6b7280;">${footNote}</p>` : ""}
  `);
  const text = `${subject}\n\n${bodyText}\n\nAmount paid: ${amount}${invoiceNumber ? `\nInvoice: ${invoiceNumber}` : ""}\n\n${footNote}`;
  return sendEmail({ to, subject, html, text });
}
