/**
 * Service Centre workorder-lifecycle emails — the email counterpart of
 * AN-CRM's customerNotify.ts (notifyJobSheetStatusChange's per-status SMS
 * copy) and its CrmJobSheet status lifecycle, adapted for My Biz Flow.
 * These notify a Service Centre partner's OWN customer about the status of
 * their device/vehicle repair; the sender is the partner's brand via
 * ${SITE_NAME}'s shared Resend credentials (no per-partner sender identity
 * yet, matching src/lib/email.ts's posture).
 *
 * TEMPLATE-READY, NOT WIRED: none of these are called from the Service
 * Centre module's Server Actions yet — wiring each one into its matching
 * job-sheet status transition is a fast-follow task. The functions below
 * are complete and ready to import once that wiring happens.
 *
 * AN-CRM's real lifecycle (src/lib/customerNotify.ts's STATUS_MESSAGES,
 * agreement/e-sign statuses excluded per explicit scope):
 *   CREATED -> REPAIR_STARTED -> REPAIR_IN_PROGRESS -> PART_PENDING ->
 *   REPAIR_COMPLETED -> CLOSED, with CANCELLED reachable from most states.
 */
import { sendEmail, emailShell, emailInfoBox, renderTemplateParagraphs, SUPPORT_EMAIL } from "@/lib/email";
import { SITE_NAME } from "@/lib/seo";
import { getEmailTemplate, renderEmailTemplate } from "@/lib/emailTemplatesData";

type WorkorderEmailInput = {
  to: string;
  customerName: string;
  workorderNumber: string;
  partnerBusinessName: string;
};

async function sendWorkorderTemplateEmail(
  key: string,
  { to, customerName, workorderNumber, partnerBusinessName }: WorkorderEmailInput,
  extraVars: Record<string, string> = {}
) {
  const tpl = await getEmailTemplate(key);
  const vars = { siteName: SITE_NAME, supportEmail: SUPPORT_EMAIL, customerName, workorderNumber, partnerBusinessName, ...extraVars };
  const subject = renderEmailTemplate(tpl.subject, vars);
  const heading = renderEmailTemplate(tpl.heading, vars);
  const { html: bodyHtml, text: bodyText } = renderTemplateParagraphs(tpl.body, vars, tpl.bodyFormat);
  const footNote = tpl.footNote ? renderEmailTemplate(tpl.footNote, vars) : "";
  const html = emailShell(`
    <h1 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 12px;">${heading}</h1>
    ${bodyHtml}
    ${emailInfoBox([
      { label: "Workorder", value: workorderNumber },
      { label: "Service Centre", value: partnerBusinessName },
    ])}
    ${footNote ? `<p style="margin:0;font-size:13px;color:#6b7280;">${footNote}</p>` : ""}
  `);
  const text = `${subject}\n\n${bodyText}\n\nWorkorder: ${workorderNumber}\nService Centre: ${partnerBusinessName}\n\n${footNote}`;
  return sendEmail({ to, subject, html, text });
}

/** Sent when a device/vehicle is first received (job sheet CREATED). */
export async function sendWorkorderReceivedEmail(input: WorkorderEmailInput) {
  return sendWorkorderTemplateEmail("workorder_received", input);
}

/** Sent when repair work begins (job sheet REPAIR_STARTED / REPAIR_IN_PROGRESS). */
export async function sendWorkorderRepairStartedEmail(input: WorkorderEmailInput) {
  return sendWorkorderTemplateEmail("workorder_repair_started", input);
}

/** Sent when repair is paused while a part is sourced (job sheet PART_PENDING). */
export async function sendWorkorderPartPendingEmail(input: WorkorderEmailInput) {
  return sendWorkorderTemplateEmail("workorder_part_pending", input);
}

/** Sent when the repair is finished and ready for pickup/delivery (job sheet REPAIR_COMPLETED). */
export async function sendWorkorderReadyEmail(input: WorkorderEmailInput) {
  return sendWorkorderTemplateEmail("workorder_ready", input);
}

/** Sent once the device is handed back to the customer and the job sheet is closed (job sheet CLOSED). */
export async function sendWorkorderCompletedEmail(input: WorkorderEmailInput) {
  return sendWorkorderTemplateEmail("workorder_completed", input);
}

/** Sent when a workorder is cancelled, from any prior state. */
export async function sendWorkorderCancelledEmail(input: WorkorderEmailInput & { reason?: string }) {
  return sendWorkorderTemplateEmail("workorder_cancelled", input, { reason: input.reason ? ` Reason: ${input.reason}.` : "" });
}
