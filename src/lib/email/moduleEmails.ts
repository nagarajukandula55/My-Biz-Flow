/**
 * Transactional emails for the Manufacturing/Wholesale B2B/Event Booking/
 * Legal/Education/HRMS/Marketplace module build-out (2026-09-25) — the
 * email counterpart of the new Telegram alert types added the same session
 * (see telegramTemplates.ts). Only wired for occasions where the module's
 * data model has a real per-record recipient email field:
 *
 *   - Legal: LegalClient.email (legal_matter_status_changed)
 *   - Education: Student.email (education_enrollment_confirmed)
 *   - HRMS: Employee.email (hrms_leave_decided, hrms_payroll_completed)
 *
 * Deliberately NOT wired (see each call site's own doc comment for the
 * decision): Manufacturing (no customer/recipient concept at all — a
 * production order isn't tied to a person), Wholesale B2B and Marketplace
 * (WholesaleCustomer/MarketplaceOrder only carry a generic `contact` string,
 * not a real email field), Event Booking (EventBooking only carries
 * `customerContact`, same story). Sending to a `contact` field that might
 * be a phone number would be worse than not sending at all, so those stay
 * Telegram-only until those models grow a real email column.
 */
import { sendEmail, emailShell, emailInfoBox, renderTemplateParagraphs, SUPPORT_EMAIL } from "@/lib/email";
import { SITE_NAME } from "@/lib/seo";
import { getEmailTemplate, renderEmailTemplate } from "@/lib/emailTemplatesData";

async function sendModuleTemplateEmail(
  key: string,
  to: string,
  vars: Record<string, string>,
  infoRows: { label: string; value: string }[]
): Promise<{ sent: boolean }> {
  const tpl = await getEmailTemplate(key);
  const allVars = { siteName: SITE_NAME, supportEmail: SUPPORT_EMAIL, ...vars };
  const subject = renderEmailTemplate(tpl.subject, allVars);
  const heading = renderEmailTemplate(tpl.heading, allVars);
  const { html: bodyHtml, text: bodyText } = renderTemplateParagraphs(tpl.body, allVars, tpl.bodyFormat);
  const footNote = tpl.footNote ? renderEmailTemplate(tpl.footNote, allVars) : "";
  const html = emailShell(`
    <h1 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 12px;">${heading}</h1>
    ${bodyHtml}
    ${infoRows.length ? emailInfoBox(infoRows) : ""}
    ${footNote ? `<p style="margin:0;font-size:13px;color:#6b7280;">${footNote}</p>` : ""}
  `);
  const text = `${subject}\n\n${bodyText}\n\n${infoRows.map((r) => `${r.label}: ${r.value}`).join("\n")}\n\n${footNote}`;
  return sendEmail({ to, subject, html, text });
}

/** A LegalMatter's status changed — sent to the client on record if they have an email. */
export async function sendLegalMatterStatusChangedEmail(opts: {
  to: string;
  partnerBusinessName: string;
  matterNumber: string;
  title: string;
  prevStatus: string;
  nextStatus: string;
}): Promise<{ sent: boolean }> {
  return sendModuleTemplateEmail(
    "legal_matter_status_changed",
    opts.to,
    {
      businessName: opts.partnerBusinessName,
      matterNumber: opts.matterNumber,
      title: opts.title,
      prevStatus: opts.prevStatus,
      nextStatus: opts.nextStatus,
    },
    [
      { label: "Matter", value: opts.matterNumber },
      { label: "Status", value: `${opts.prevStatus} → ${opts.nextStatus}` },
    ]
  );
}

/** A new Enrollment was created — sent to the student if they have an email on file. */
export async function sendEducationEnrollmentConfirmedEmail(opts: {
  to: string;
  partnerBusinessName: string;
  studentName: string;
  batchName: string;
  courseName: string;
}): Promise<{ sent: boolean }> {
  return sendModuleTemplateEmail(
    "education_enrollment_confirmed",
    opts.to,
    {
      businessName: opts.partnerBusinessName,
      studentName: opts.studentName,
      batchName: opts.batchName,
      courseName: opts.courseName,
    },
    [
      { label: "Batch", value: opts.batchName },
      { label: "Course", value: opts.courseName },
    ]
  );
}

/** A LeaveRequest was Approved/Rejected — sent to the employee if they have an email on file. */
export async function sendHrmsLeaveDecidedEmail(opts: {
  to: string;
  partnerBusinessName: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  decision: string;
}): Promise<{ sent: boolean }> {
  return sendModuleTemplateEmail(
    "hrms_leave_decided",
    opts.to,
    {
      businessName: opts.partnerBusinessName,
      employeeName: opts.employeeName,
      leaveType: opts.leaveType,
      startDate: opts.startDate,
      endDate: opts.endDate,
      decision: opts.decision,
    },
    [
      { label: "Leave type", value: opts.leaveType },
      { label: "Dates", value: `${opts.startDate} – ${opts.endDate}` },
      { label: "Decision", value: opts.decision },
    ]
  );
}

/** A Payslip was Finalized — sent to the employee if they have an email on file. */
export async function sendHrmsPayrollCompletedEmail(opts: {
  to: string;
  partnerBusinessName: string;
  employeeName: string;
  month: number;
  year: number;
  netPay: string;
}): Promise<{ sent: boolean }> {
  return sendModuleTemplateEmail(
    "hrms_payroll_completed",
    opts.to,
    {
      businessName: opts.partnerBusinessName,
      employeeName: opts.employeeName,
      month: String(opts.month),
      year: String(opts.year),
      netPay: opts.netPay,
    },
    [
      { label: "Period", value: `${opts.month}/${opts.year}` },
      { label: "Net pay", value: opts.netPay },
    ]
  );
}
