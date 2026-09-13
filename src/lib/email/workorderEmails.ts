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
import { sendEmail, emailShell, emailButton, emailInfoBox, SUPPORT_EMAIL } from "@/lib/email";
import { SITE_NAME } from "@/lib/seo";

type WorkorderEmailInput = {
  to: string;
  customerName: string;
  workorderNumber: string;
  partnerBusinessName: string;
};

function workorderShell(opts: {
  heading: string;
  intro: string;
  workorderNumber: string;
  partnerBusinessName: string;
  footNote?: string;
}): string {
  return emailShell(`
    <h1 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 12px;">${opts.heading}</h1>
    <p style="margin:0 0 16px;">${opts.intro}</p>
    ${emailInfoBox([
      { label: "Workorder", value: opts.workorderNumber },
      { label: "Service Centre", value: opts.partnerBusinessName },
    ])}
    ${opts.footNote ? `<p style="margin:0;font-size:13px;color:#6b7280;">${opts.footNote}</p>` : ""}
  `);
}

/** Sent when a device/vehicle is first received (job sheet CREATED). */
export async function sendWorkorderReceivedEmail({ to, customerName, workorderNumber, partnerBusinessName }: WorkorderEmailInput) {
  const subject = `We've received your device — Workorder ${workorderNumber}`;
  const html = workorderShell({
    heading: `Hi ${customerName}, we've got your device`,
    intro: `Your device has been received for service. We'll keep you updated as it moves through repair.`,
    workorderNumber,
    partnerBusinessName,
  });
  const text = `Hi ${customerName},\n\nYour device has been received for service.\n\nWorkorder: ${workorderNumber}\nService Centre: ${partnerBusinessName}\n\nWe'll keep you updated as it moves through repair.\n\nQuestions? Contact ${SUPPORT_EMAIL}.`;
  return sendEmail({ to, subject, html, text });
}

/** Sent when repair work begins (job sheet REPAIR_STARTED / REPAIR_IN_PROGRESS). */
export async function sendWorkorderRepairStartedEmail({ to, customerName, workorderNumber, partnerBusinessName }: WorkorderEmailInput) {
  const subject = `Repair started — Workorder ${workorderNumber}`;
  const html = workorderShell({
    heading: `Hi ${customerName}, repair is underway`,
    intro: `Our technicians have started working on your device.`,
    workorderNumber,
    partnerBusinessName,
  });
  const text = `Hi ${customerName},\n\nRepair has started on your device.\n\nWorkorder: ${workorderNumber}\nService Centre: ${partnerBusinessName}\n\nQuestions? Contact ${SUPPORT_EMAIL}.`;
  return sendEmail({ to, subject, html, text });
}

/** Sent when repair is paused while a part is sourced (job sheet PART_PENDING). */
export async function sendWorkorderPartPendingEmail({ to, customerName, workorderNumber, partnerBusinessName }: WorkorderEmailInput) {
  const subject = `Waiting on a part — Workorder ${workorderNumber}`;
  const html = workorderShell({
    heading: `Hi ${customerName}, we're sourcing a part`,
    intro: `Your repair is on hold while we source a required part. We'll notify you as soon as it resumes.`,
    workorderNumber,
    partnerBusinessName,
  });
  const text = `Hi ${customerName},\n\nYour repair is on hold while we source a required part. We'll notify you once it resumes.\n\nWorkorder: ${workorderNumber}\nService Centre: ${partnerBusinessName}\n\nQuestions? Contact ${SUPPORT_EMAIL}.`;
  return sendEmail({ to, subject, html, text });
}

/** Sent when the repair is finished and ready for pickup/delivery (job sheet REPAIR_COMPLETED). */
export async function sendWorkorderReadyEmail({ to, customerName, workorderNumber, partnerBusinessName }: WorkorderEmailInput) {
  const subject = `Ready for pickup — Workorder ${workorderNumber}`;
  const html = workorderShell({
    heading: `Good news, ${customerName}!`,
    intro: `Your device repair is complete and ready for pickup or delivery.`,
    workorderNumber,
    partnerBusinessName,
  });
  const text = `Good news, ${customerName}!\n\nYour device repair is complete and ready for pickup/delivery.\n\nWorkorder: ${workorderNumber}\nService Centre: ${partnerBusinessName}\n\nQuestions? Contact ${SUPPORT_EMAIL}.`;
  return sendEmail({ to, subject, html, text });
}

/** Sent once the device is handed back to the customer and the job sheet is closed (job sheet CLOSED). */
export async function sendWorkorderCompletedEmail({ to, customerName, workorderNumber, partnerBusinessName }: WorkorderEmailInput) {
  const subject = `Handed over — Workorder ${workorderNumber}`;
  const html = workorderShell({
    heading: `Thank you, ${customerName}!`,
    intro: `Your device has been handed over. Thank you for choosing ${partnerBusinessName}.`,
    workorderNumber,
    partnerBusinessName,
  });
  const text = `Thank you, ${customerName}!\n\nYour device has been handed over. Thank you for choosing ${partnerBusinessName}.\n\nWorkorder: ${workorderNumber}\n\nQuestions? Contact ${SUPPORT_EMAIL}.`;
  return sendEmail({ to, subject, html, text });
}

/** Sent when a workorder is cancelled, from any prior state. */
export async function sendWorkorderCancelledEmail({
  to,
  customerName,
  workorderNumber,
  partnerBusinessName,
  reason,
}: WorkorderEmailInput & { reason?: string }) {
  const subject = `Workorder cancelled — ${workorderNumber}`;
  const html = workorderShell({
    heading: `Hi ${customerName}, your workorder was cancelled`,
    intro: `Workorder ${workorderNumber} has been cancelled.${reason ? ` Reason: ${reason}.` : ""}`,
    workorderNumber,
    partnerBusinessName,
    footNote: `If you believe this was a mistake, contact ${partnerBusinessName} directly, or reach ${SITE_NAME} support at ${SUPPORT_EMAIL}.`,
  });
  const text = `Hi ${customerName},\n\nWorkorder ${workorderNumber} has been cancelled.${reason ? ` Reason: ${reason}.` : ""}\n\nService Centre: ${partnerBusinessName}\n\nQuestions? Contact ${SUPPORT_EMAIL}.`;
  return sendEmail({ to, subject, html, text });
}
