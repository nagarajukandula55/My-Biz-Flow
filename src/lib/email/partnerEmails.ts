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
import { sendEmail, emailShell, emailButton, emailInfoBox, SUPPORT_EMAIL } from "@/lib/email";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

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
  const subject = `We've received your ${SITE_NAME} partner application`;
  const html = emailShell(`
    <h1 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 12px;">Thanks, ${businessName}</h1>
    <p style="margin:0 0 16px;">Your application to become a ${SITE_NAME} partner has been submitted and is under review.</p>
    <p style="margin:0;font-size:13px;color:#6b7280;">We'll email you as soon as a decision is made — usually within a couple of business days.</p>
  `);
  const text = `Thanks, ${businessName}!\n\nYour application to become a ${SITE_NAME} partner has been submitted and is under review.\n\nWe'll email you as soon as a decision is made.\n\nNeed help? Contact ${SUPPORT_EMAIL}.`;
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
  const subject = `Your ${SITE_NAME} partner application was approved`;
  const html = emailShell(`
    <h1 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 12px;">You're approved, ${businessName}!</h1>
    <p style="margin:0 0 16px;">Your ${SITE_NAME} partner application has been approved and your account is ready.</p>
    ${emailInfoBox([{ label: "Partner ID", value: partnerId }])}
    <div style="text-align:center;margin:0 0 20px;">${emailButton("Sign in", loginUrl)}</div>
    <p style="margin:0;font-size:13px;color:#6b7280;">Use the login details you registered with to sign in.</p>
  `);
  const text = `You're approved, ${businessName}!\n\nYour ${SITE_NAME} partner application has been approved and your account is ready.\n\nPartner ID: ${partnerId}\n\nSign in: ${loginUrl}\n\nNeed help? Contact ${SUPPORT_EMAIL}.`;
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
  const subject = `Update on your ${SITE_NAME} partner application`;
  const html = emailShell(`
    <h1 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 12px;">Hi ${businessName},</h1>
    <p style="margin:0 0 16px;">After review, we're not able to approve your ${SITE_NAME} partner application at this time.${reason ? ` Reason: ${reason}.` : ""}</p>
    <p style="margin:0;font-size:13px;color:#6b7280;">If you have questions about this decision, contact us at ${SUPPORT_EMAIL}.</p>
  `);
  const text = `Hi ${businessName},\n\nAfter review, we're not able to approve your ${SITE_NAME} partner application at this time.${reason ? ` Reason: ${reason}.` : ""}\n\nQuestions? Contact ${SUPPORT_EMAIL}.`;
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
  const subject = `Your ${SITE_NAME} account is ready`;
  const html = emailShell(`
    <h1 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 12px;">Hi ${name}, your account is ready</h1>
    <p style="margin:0 0 16px;">An account has been created for you on ${SITE_NAME}.</p>
    ${emailInfoBox([
      { label: "Login email", value: to },
      { label: "Temporary password", value: tempPassword },
    ])}
    <div style="text-align:center;margin:0 0 20px;">${emailButton("Sign in", loginUrl)}</div>
    <p style="margin:0;font-size:13px;color:#6b7280;">You'll be asked to set a new password the first time you sign in.</p>
  `);
  const text = `Hi ${name}, your account is ready\n\nAn account has been created for you on ${SITE_NAME}.\n\nLogin email: ${to}\nTemporary password: ${tempPassword}\n\nSign in: ${loginUrl}\n\nYou'll be asked to set a new password the first time you sign in.\n\nNeed help? Contact ${SUPPORT_EMAIL}.`;
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
  const subject = `Invoice ${invoiceNumber} from ${partnerBusinessName}`;
  const html = emailShell(`
    <h1 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 12px;">Hi ${customerName},</h1>
    <p style="margin:0 0 16px;">Here's your invoice from ${partnerBusinessName}.</p>
    ${emailInfoBox([
      { label: "Invoice number", value: invoiceNumber },
      { label: "Amount", value: grandTotal },
    ])}
    ${pdfUrl ? `<div style="text-align:center;margin:0 0 20px;">${emailButton("View invoice", pdfUrl)}</div>` : ""}
    <p style="margin:0;font-size:13px;color:#6b7280;">Questions about this invoice? Contact ${partnerBusinessName} directly.</p>
  `);
  const text = `Hi ${customerName},\n\nHere's your invoice from ${partnerBusinessName}.\n\nInvoice number: ${invoiceNumber}\nAmount: ${grandTotal}\n${pdfUrl ? `\nView invoice: ${pdfUrl}\n` : ""}\nQuestions about this invoice? Contact ${partnerBusinessName} directly.`;
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
  const subject = `Payment received — thank you`;
  const html = emailShell(`
    <h1 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 12px;">Thank you, ${customerName}!</h1>
    <p style="margin:0 0 16px;">We've received your payment to ${partnerBusinessName}.</p>
    ${emailInfoBox([
      { label: "Amount paid", value: amount },
      ...(invoiceNumber ? [{ label: "Invoice", value: invoiceNumber }] : []),
    ])}
    <p style="margin:0;font-size:13px;color:#6b7280;">This is a confirmation of payment, not a tax invoice. Contact ${partnerBusinessName} for a copy of your invoice if you need one.</p>
  `);
  const text = `Thank you, ${customerName}!\n\nWe've received your payment to ${partnerBusinessName}.\n\nAmount paid: ${amount}${invoiceNumber ? `\nInvoice: ${invoiceNumber}` : ""}\n\nContact ${partnerBusinessName} for a copy of your invoice if you need one.`;
  return sendEmail({ to, subject, html, text });
}
