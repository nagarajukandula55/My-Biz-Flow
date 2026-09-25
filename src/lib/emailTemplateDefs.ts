/**
 * Canonical catalog of every transactional email's editable copy — the
 * single source of truth for both the render logic (src/lib/email.ts,
 * src/lib/email/partnerEmails.ts, src/lib/email/workorderEmails.ts) and the
 * My Biz Flow Admin edit UI (a separate repo/deployment — see
 * src/app/admin/(protected)/email-templates/page.tsx there). Kept in sync
 * by hand across the two repos, same as telegramTemplateDefs.ts already is
 * (no shared package between the two Next.js apps).
 *
 * Each entry's default* fields are the literal copy used when no admin
 * override exists in the EmailTemplate table (see prisma/schema.prisma).
 * `{{token}}` placeholders are replaced by renderEmailTemplate() with the
 * values in `variables`. Structural pieces — info-box rows (order numbers,
 * amounts), button URLs, the outer shell/footer — stay code-driven in the
 * sender functions since they carry real per-send data, not wording; only
 * subject/heading/body/footNote (the parts an admin would want to reword)
 * live here.
 */

export type EmailTemplateDef = {
  key: string;
  label: string;
  /** Group shown in the admin editor. */
  group: "Auth" | "Partner lifecycle" | "Workorder lifecycle" | "Billing" | "Module alert";
  /** Token names this template's default fields may reference as {{token}}. */
  variables: string[];
  defaultSubject: string;
  defaultHeading: string;
  defaultBody: string;
  defaultFootNote?: string;
  /** "text" (default) or "html" — see EmailTemplate.bodyFormat in prisma/schema.prisma. */
  defaultBodyFormat?: "text" | "html";
};

export const EMAIL_TEMPLATE_DEFS: EmailTemplateDef[] = [
  {
    key: "password_reset",
    label: "Password reset link",
    group: "Auth",
    variables: [],
    defaultSubject: "Reset your {{siteName}} password",
    defaultHeading: "Reset your password",
    defaultBody:
      "We received a request to reset the password on your {{siteName}} partner account.\n\nThis link expires in 30 minutes. If you didn't request this, you can safely ignore this email — your password won't be changed.",
  },
  {
    key: "partner_welcome",
    label: "Partner welcome (self-signup)",
    group: "Partner lifecycle",
    variables: ["businessName", "partnerId"],
    defaultSubject: "Welcome to {{siteName}} — your account is ready",
    defaultHeading: "Welcome, {{businessName}}",
    defaultBody:
      "Your {{siteName}} partner account has been created and is ready to use.\n\nYou're already signed in on this device and were taken straight to set your own password. Use your Partner ID above to sign in from any other device.",
  },
  {
    key: "partner_application_received",
    label: "Partner application received",
    group: "Partner lifecycle",
    variables: ["businessName"],
    defaultSubject: "We've received your {{siteName}} partner application",
    defaultHeading: "Thanks, {{businessName}}",
    defaultBody:
      "Your application to become a {{siteName}} partner has been submitted and is under review.\n\nWe'll email you as soon as a decision is made — usually within a couple of business days.",
  },
  {
    key: "partner_approved",
    label: "Partner application approved",
    group: "Partner lifecycle",
    variables: ["businessName"],
    defaultSubject: "Your {{siteName}} partner application was approved",
    defaultHeading: "You're approved, {{businessName}}!",
    defaultBody:
      "Your {{siteName}} partner application has been approved and your account is ready.\n\nUse the login details you registered with to sign in.",
  },
  {
    key: "partner_rejected",
    label: "Partner application rejected",
    group: "Partner lifecycle",
    variables: ["businessName", "reason"],
    defaultSubject: "Update on your {{siteName}} partner application",
    defaultHeading: "Hi {{businessName}},",
    defaultBody:
      "After review, we're not able to approve your {{siteName}} partner application at this time.{{reason}}\n\nIf you have questions about this decision, contact us at {{supportEmail}}.",
  },
  {
    key: "admin_issued_credentials",
    label: "Admin-issued login / password reset",
    group: "Auth",
    variables: ["name"],
    defaultSubject: "Your {{siteName}} account is ready",
    defaultHeading: "Hi {{name}}, your account is ready",
    defaultBody:
      "An account has been created for you on {{siteName}}.\n\nYou'll be asked to set a new password the first time you sign in.",
  },
  {
    key: "platform_subscription_payment",
    label: "Subscription payment invoice (My Biz Flow → partner)",
    group: "Billing",
    variables: ["businessName", "planName", "amount", "billingCycle", "invoiceNumber"],
    defaultSubject: "Your {{siteName}} subscription invoice — {{invoiceNumber}}",
    defaultHeading: "Thank you, {{businessName}}",
    defaultBody: "We've recorded your {{siteName}} subscription payment.",
    defaultFootNote: "This is a receipt for your {{siteName}} platform subscription, not an invoice from your own business. Questions? Contact {{supportEmail}}.",
  },
  {
    key: "invoice_sent",
    label: "Invoice sent to customer",
    group: "Billing",
    variables: ["customerName", "partnerBusinessName"],
    defaultSubject: "Invoice {{invoiceNumber}} from {{partnerBusinessName}}",
    defaultHeading: "Hi {{customerName}},",
    defaultBody: "Here's your invoice from {{partnerBusinessName}}.",
    defaultFootNote: "Questions about this invoice? Contact {{partnerBusinessName}} directly.",
  },
  {
    key: "payment_confirmation",
    label: "Payment confirmation",
    group: "Billing",
    variables: ["customerName", "partnerBusinessName"],
    defaultSubject: "Payment received — thank you",
    defaultHeading: "Thank you, {{customerName}}!",
    defaultBody: "We've received your payment to {{partnerBusinessName}}.",
    defaultFootNote: "This is a confirmation of payment, not a tax invoice. Contact {{partnerBusinessName}} for a copy of your invoice if you need one.",
  },
  {
    key: "workorder_received",
    label: "Workorder — device received",
    group: "Workorder lifecycle",
    variables: ["customerName"],
    defaultSubject: "We've received your device — Workorder {{workorderNumber}}",
    defaultHeading: "Hi {{customerName}}, we've got your device",
    defaultBody: "Your device has been received for service. We'll keep you updated as it moves through repair.",
  },
  {
    key: "workorder_repair_started",
    label: "Workorder — repair started",
    group: "Workorder lifecycle",
    variables: ["customerName"],
    defaultSubject: "Repair started — Workorder {{workorderNumber}}",
    defaultHeading: "Hi {{customerName}}, repair is underway",
    defaultBody: "Our technicians have started working on your device.",
  },
  {
    key: "workorder_part_pending",
    label: "Workorder — part pending",
    group: "Workorder lifecycle",
    variables: ["customerName"],
    defaultSubject: "Waiting on a part — Workorder {{workorderNumber}}",
    defaultHeading: "Hi {{customerName}}, we're sourcing a part",
    defaultBody: "Your repair is on hold while we source a required part. We'll notify you as soon as it resumes.",
  },
  {
    key: "workorder_ready",
    label: "Workorder — ready for pickup",
    group: "Workorder lifecycle",
    variables: ["customerName"],
    defaultSubject: "Ready for pickup — Workorder {{workorderNumber}}",
    defaultHeading: "Good news, {{customerName}}!",
    defaultBody: "Your device repair is complete and ready for pickup or delivery.",
  },
  {
    key: "workorder_completed",
    label: "Workorder — handed over / closed",
    group: "Workorder lifecycle",
    variables: ["customerName", "partnerBusinessName"],
    defaultSubject: "Handed over — Workorder {{workorderNumber}}",
    defaultHeading: "Thank you, {{customerName}}!",
    defaultBody: "Your device has been handed over. Thank you for choosing {{partnerBusinessName}}.",
  },
  {
    key: "workorder_cancelled",
    label: "Workorder — cancelled",
    group: "Workorder lifecycle",
    variables: ["customerName", "reason"],
    defaultSubject: "Workorder cancelled — {{workorderNumber}}",
    defaultHeading: "Hi {{customerName}}, your workorder was cancelled",
    defaultBody: "Workorder {{workorderNumber}} has been cancelled.{{reason}}",
    defaultFootNote: "If you believe this was a mistake, contact {{partnerBusinessName}} directly, or reach {{siteName}} support at {{supportEmail}}.",
  },
  // --- Module alert emails (2026-09-25 build-out) -------------------------
  // Matching keys for the ~19 new Telegram alert types added this session
  // (see telegramTemplateDefs.ts). Every event gets a def here so an admin
  // can preview/author its copy even where no send is wired yet (see each
  // module's actions.ts/lib file for which are actually sent — only
  // Legal/Education/HRMS have a real per-record recipient email field;
  // Manufacturing, Wholesale B2B, Event Booking, and Marketplace don't have
  // a clear "customer email" the way Service Centre workorders do, so no
  // send call exists for those yet even though the def/copy is here).
  {
    key: "production_delayed",
    label: "Manufacturing: production order delayed",
    group: "Module alert",
    variables: ["businessName", "orderId", "productName", "quantityPlanned"],
    defaultSubject: "Production delayed — {{productName}} ({{orderId}})",
    defaultHeading: "Production order delayed",
    defaultBody: "Production order {{orderId}} for {{productName}} (planned qty {{quantityPlanned}}) has been marked Delayed at {{businessName}}.",
  },
  {
    key: "production_stock_shortfall",
    label: "Manufacturing: stock shortfall blocking production",
    group: "Module alert",
    variables: ["businessName", "orderId", "productName", "materialLabel", "available", "required"],
    defaultSubject: "Production blocked — stock shortfall on {{productName}}",
    defaultHeading: "Production blocked: stock shortfall",
    defaultBody: "Production order {{orderId}} for {{productName}} at {{businessName}} is blocked: {{materialLabel}} has {{available}} available but {{required}} is required.",
  },
  {
    key: "production_completed",
    label: "Manufacturing: production completed",
    group: "Module alert",
    variables: ["businessName", "orderId", "productName", "quantityProduced", "totalCost"],
    defaultSubject: "Production completed — {{productName}} ({{orderId}})",
    defaultHeading: "Production completed",
    defaultBody: "Production order {{orderId}} for {{productName}} at {{businessName}} is complete. Quantity produced: {{quantityProduced}}. Total cost: {{totalCost}}.",
  },
  {
    key: "wholesale_large_order",
    label: "Wholesale B2B: large order placed",
    group: "Module alert",
    variables: ["businessName", "orderNumber", "customerName", "amount"],
    defaultSubject: "New wholesale order {{orderNumber}} — {{amount}}",
    defaultHeading: "New wholesale order placed",
    defaultBody: "{{customerName}} placed order {{orderNumber}} with {{businessName}} for {{amount}}.",
  },
  {
    key: "wholesale_credit_limit_breach",
    label: "Wholesale B2B: credit limit breach blocked",
    group: "Module alert",
    variables: ["businessName", "customerName", "amount", "outstanding", "creditLimit"],
    defaultSubject: "Order blocked — credit limit breach ({{customerName}})",
    defaultHeading: "Order blocked: credit limit breach",
    defaultBody: "An order of {{amount}} for {{customerName}} at {{businessName}} was blocked — it would have pushed outstanding {{outstanding}} over their credit limit of {{creditLimit}}.",
  },
  {
    key: "event_booking_confirmed",
    label: "Event booking confirmed",
    group: "Module alert",
    variables: ["businessName", "eventName", "bookingId"],
    defaultSubject: "Event confirmed — {{eventName}}",
    defaultHeading: "Event confirmed",
    defaultBody: "{{eventName}} (booking {{bookingId}}) has been confirmed at {{businessName}}.",
  },
  {
    key: "event_starting_soon",
    label: "Event starting soon",
    group: "Module alert",
    variables: ["businessName", "eventName", "bookingId", "startAt"],
    defaultSubject: "Reminder: {{eventName}} starts soon",
    defaultHeading: "Your event starts soon",
    defaultBody: "{{eventName}} (booking {{bookingId}}) at {{businessName}} starts at {{startAt}}.",
  },
  {
    key: "event_payment_received",
    label: "Event payment received",
    group: "Module alert",
    variables: ["businessName", "eventName", "bookingId", "amount", "totalPaid"],
    defaultSubject: "Payment received — {{eventName}}",
    defaultHeading: "Payment received",
    defaultBody: "{{amount}} received for {{eventName}} (booking {{bookingId}}) at {{businessName}}. Total paid so far: {{totalPaid}}.",
  },
  {
    key: "legal_court_date_upcoming",
    label: "Legal: upcoming court date",
    group: "Module alert",
    variables: ["businessName", "matterNumber", "title", "courtDate"],
    defaultSubject: "Upcoming court date — {{matterNumber}}",
    defaultHeading: "Upcoming court date",
    defaultBody: "Matter {{matterNumber}} — {{title}} has a court date on {{courtDate}}. Handled by {{businessName}}.",
  },
  {
    key: "legal_matter_status_changed",
    label: "Legal: matter status changed",
    group: "Module alert",
    variables: ["businessName", "matterNumber", "title", "prevStatus", "nextStatus"],
    defaultSubject: "Matter status update — {{matterNumber}}",
    defaultHeading: "Your matter status has changed",
    defaultBody: "Matter {{matterNumber}} — {{title}} moved from {{prevStatus}} to {{nextStatus}} at {{businessName}}.",
  },
  {
    key: "education_fee_overdue",
    label: "Education: fee installment overdue",
    group: "Module alert",
    variables: ["businessName", "studentName", "installmentLabel", "dueDate", "amount"],
    defaultSubject: "Fee installment overdue — {{installmentLabel}}",
    defaultHeading: "Fee installment overdue",
    defaultBody: "Hi {{studentName}}, your {{installmentLabel}} installment of {{amount}} due {{dueDate}} at {{businessName}} is now overdue. Please settle it at the earliest.",
  },
  {
    key: "education_batch_starting",
    label: "Education: batch starting",
    group: "Module alert",
    variables: ["businessName", "batchName", "courseName", "startDate"],
    defaultSubject: "Your batch starts soon — {{batchName}}",
    defaultHeading: "Your batch starts soon",
    defaultBody: "{{batchName}} ({{courseName}}) at {{businessName}} starts on {{startDate}}.",
  },
  {
    key: "education_enrollment_confirmed",
    label: "Education: enrollment confirmed",
    group: "Module alert",
    variables: ["businessName", "studentName", "batchName", "courseName"],
    defaultSubject: "Enrollment confirmed — {{batchName}}",
    defaultHeading: "You're enrolled!",
    defaultBody: "Hi {{studentName}}, you've been enrolled into {{batchName}} ({{courseName}}) at {{businessName}}.",
  },
  {
    key: "hrms_late_check_in",
    label: "HRMS: late / blocked check-in",
    group: "Module alert",
    variables: ["businessName", "employeeName", "nearestOfficeInfo"],
    defaultSubject: "Check-in blocked — {{employeeName}}",
    defaultHeading: "Check-in blocked",
    defaultBody: "{{employeeName}}'s check-in at {{businessName}} was blocked for being outside every registered office's geofence.{{nearestOfficeInfo}}",
  },
  {
    key: "hrms_leave_request_submitted",
    label: "HRMS: leave request submitted",
    group: "Module alert",
    variables: ["businessName", "employeeName", "leaveType", "startDate", "endDate"],
    defaultSubject: "Leave request submitted — {{employeeName}}",
    defaultHeading: "Leave request submitted",
    defaultBody: "{{employeeName}} requested {{leaveType}} leave from {{startDate}} to {{endDate}} at {{businessName}}.",
  },
  {
    key: "hrms_leave_decided",
    label: "HRMS: leave request approved/rejected",
    group: "Module alert",
    variables: ["businessName", "employeeName", "leaveType", "startDate", "endDate", "decision"],
    defaultSubject: "Your leave request was {{decision}}",
    defaultHeading: "Leave request {{decision}}",
    defaultBody: "Hi {{employeeName}}, your {{leaveType}} leave from {{startDate}} to {{endDate}} at {{businessName}} was {{decision}}.",
  },
  {
    key: "hrms_payroll_completed",
    label: "HRMS: payroll run completed",
    group: "Module alert",
    variables: ["businessName", "employeeName", "month", "year", "netPay"],
    defaultSubject: "Payslip ready — {{month}}/{{year}}",
    defaultHeading: "Your payslip is ready",
    defaultBody: "Hi {{employeeName}}, your payslip for {{month}}/{{year}} at {{businessName}} has been finalized. Net pay: {{netPay}}.",
  },
  {
    key: "marketplace_new_order",
    label: "Marketplace: new order placed",
    group: "Module alert",
    variables: ["businessName", "listingTitle", "quantity", "customerName", "totalAmount"],
    defaultSubject: "New marketplace order — {{listingTitle}}",
    defaultHeading: "New marketplace order",
    defaultBody: "{{customerName}} ordered {{quantity}} x {{listingTitle}} from {{businessName}} for {{totalAmount}}.",
  },
  {
    key: "marketplace_vendor_payout",
    label: "Marketplace: vendor payout",
    group: "Module alert",
    variables: ["businessName", "vendorName", "amount"],
    defaultSubject: "Vendor payout — {{amount}}",
    defaultHeading: "Vendor payout processed",
    defaultBody: "A payout of {{amount}} was processed for {{vendorName}} at {{businessName}}.",
  },
];

export function findEmailTemplateDef(key: string): EmailTemplateDef | undefined {
  return EMAIL_TEMPLATE_DEFS.find((d) => d.key === key);
}
