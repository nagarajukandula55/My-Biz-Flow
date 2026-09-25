/**
 * Canonical catalog of every Telegram message template this app can send —
 * the single source of truth for both the render logic (telegramTemplates.ts)
 * and the My Biz Flow Admin edit UI (a separate repo/deployment — see
 * src/app/admin/(protected)/telegram/page.tsx there). Kept in sync by hand
 * across the two repos, same as telegram.ts/telegramTemplates.ts themselves
 * already are (no shared package between the two Next.js apps).
 *
 * Each entry's `defaultBody` is the literal text sent when no admin override
 * exists in the TelegramMessageTemplate table (see prisma/schema.prisma).
 * `{{token}}` placeholders are replaced by renderTelegramTemplate() with the
 * values in `variables` — an admin can reword, re-emoji, or restructure the
 * text freely as long as the tokens they want filled in stay present.
 *
 * `command` is the exact Telegram slash-command (handled in
 * src/app/api/telegram/webhook/route.ts) that triggers this template
 * on demand from within the chat itself:
 *   - report_daily/weekly/monthly: sends that partner's REAL current digest,
 *     computed the same way the scheduled cron job does — lets a partner
 *     pull an up-to-date report any time instead of waiting for the digest.
 *   - test_* commands: sends the template filled with sample placeholder
 *     data, so anyone (partner or admin, from either connected chat) can see
 *     exactly how a template renders without waiting for the real event.
 *   - help: lists every available command.
 * None of these require Super Admin — any chat connected via the normal
 * "Connect Telegram" flow can trigger them for its own partner.
 */

export type TelegramTemplateDef = {
  key: string;
  label: string;
  /** Group shown in the admin editor / /help listing. */
  group: "Event alert" | "Business report" | "System";
  /** The exact Telegram slash-command that triggers a live/sample send of this template. */
  command: string;
  /** Token names this template's defaultBody may reference as {{token}}. */
  variables: string[];
  defaultBody: string;
};

export const TELEGRAM_TEMPLATE_DEFS: TelegramTemplateDef[] = [
  {
    key: "new_workorder",
    label: "New workorder assigned",
    group: "Event alert",
    command: "/test_new_workorder",
    variables: [
      "businessName", "workorderNumber", "customerName", "customerPhone", "deviceCategory",
      "brandName", "modelName", "imeiOrSerialNumber", "faultDescription", "priority",
      "loggedBy", "receivedDate", "estimatedAmount", "warrantyStatus",
    ],
    defaultBody:
      "🆕 <b>New Workorder — {{businessName}}</b>\n\n<pre>\nWorkorder     {{workorderNumber}}\nCustomer      {{customerName}}\nPhone         {{customerPhone}}\nDevice        {{deviceCategory}}\nBrand/Model   {{brandName}} / {{modelName}}\nIMEI/Serial   {{imeiOrSerialNumber}}\nPriority      {{priority}}\nWarranty      {{warrantyStatus}}\nLogged by     {{loggedBy}}\nReceived      {{receivedDate}}\nEst. amount   {{estimatedAmount}}\n</pre>\n<b>Fault:</b> <i>{{faultDescription}}</i>",
  },
  {
    key: "workorder_closed",
    label: "Workorder closed",
    group: "Event alert",
    command: "/test_workorder_closed",
    variables: [
      "businessName", "workorderNumber", "amount", "customerName", "customerPhone",
      "brandName", "modelName", "engineerName", "warrantyStatus", "remark",
    ],
    defaultBody:
      "✅ <b>Workorder Closed — {{businessName}}</b>\n\n<pre>\nWorkorder     {{workorderNumber}}\nCustomer      {{customerName}}\nPhone         {{customerPhone}}\nBrand/Model   {{brandName}} / {{modelName}}\nEngineer      {{engineerName}}\nWarranty      {{warrantyStatus}}\nInvoiced      {{amount}}\n</pre>\n<b>Remark:</b> <i>{{remark}}</i>\n\n<i>Thank you for using {{businessName}}.</i>",
  },
  {
    key: "workorder_cancelled",
    label: "Workorder cancelled",
    group: "Event alert",
    command: "/test_workorder_cancelled",
    variables: [
      "businessName", "workorderNumber", "reason", "customerName", "customerPhone",
      "brandName", "modelName", "loggedBy", "receivedDate",
    ],
    defaultBody:
      "🚫 <b>Workorder Cancelled — {{businessName}}</b>\n\n<pre>\nWorkorder     {{workorderNumber}}\nCustomer      {{customerName}}\nPhone         {{customerPhone}}\nBrand/Model   {{brandName}} / {{modelName}}\nLogged by     {{loggedBy}}\nReceived      {{receivedDate}}\n</pre>\n<b>Reason:</b> <i>{{reason}}</i>",
  },
  {
    key: "payment_received",
    label: "Payment received",
    group: "Event alert",
    command: "/test_payment_received",
    variables: ["businessName", "amount", "planName"],
    defaultBody:
      "💰 <b>Payment Received</b>\n\n<pre>\nBusiness      {{businessName}}\nPlan          {{planName}}\nAmount        {{amount}}\n</pre>\n<i>Thanks for keeping your subscription active.</i>",
  },
  {
    key: "payment_due",
    label: "Payment due",
    group: "Event alert",
    command: "/test_payment_due",
    variables: ["businessName", "amount", "dueDate"],
    defaultBody:
      "⏰ <b>Payment Due</b>\n\n<pre>\nBusiness      {{businessName}}\nAmount        {{amount}}\nDue date      {{dueDate}}\n</pre>\n<i>Please settle this before the due date to avoid interruption.</i>",
  },
  {
    key: "subscription_expiring",
    label: "Subscription expiring",
    group: "Event alert",
    command: "/test_subscription_expiring",
    variables: ["businessName", "expiresOn", "planName"],
    defaultBody:
      "⚠️ <b>Subscription Expiring</b>\n\n<pre>\nBusiness      {{businessName}}\nPlan          {{planName}}\nExpires       {{expiresOn}}\n</pre>\n<i>Renew to keep your account uninterrupted.</i>",
  },
  {
    key: "low_stock",
    label: "Low stock alert",
    group: "Event alert",
    command: "/test_low_stock",
    variables: ["businessName", "itemName", "quantityRemaining", "reorderThreshold"],
    defaultBody:
      "📉 <b>Low Stock — {{businessName}}</b>\n\n<pre>\nItem          {{itemName}}\nRemaining     {{quantityRemaining}}\nThreshold     {{reorderThreshold}}\n</pre>\n<i>Time to reorder this item.</i>",
  },
  {
    key: "pna_logged",
    label: "Part Not Available logged",
    group: "Event alert",
    command: "/test_pna_logged",
    variables: ["businessName", "workorderId", "materialLabel", "qty", "customerName", "brandJobNo"],
    defaultBody:
      "🧩 <b>Part Not Available — {{businessName}}</b>\n\n<pre>\nWorkorder     {{workorderId}}\nPart          {{materialLabel}}\nQty needed    {{qty}}\nCustomer      {{customerName}}\nBrand Job No. {{brandJobNo}}\n</pre>\n<i>Added to the Parts Not Available list — go source it from Inventory.</i>",
  },
  {
    key: "inquiry_assigned",
    label: "Inquiry assigned",
    group: "Event alert",
    command: "/test_inquiry_assigned",
    variables: ["businessName", "inquiryNumber", "customerName", "customerPhone", "serviceType", "complaint"],
    defaultBody:
      "📞 <b>New Inquiry — {{businessName}}</b>\n\n<pre>\nInquiry       {{inquiryNumber}}\nCustomer      {{customerName}}\nPhone         {{customerPhone}}\nService type  {{serviceType}}\nComplaint     {{complaint}}\n</pre>\n<i>Open it in Service Centre → Inquiries to accept, close, or convert to a workorder.</i>",
  },
  {
    key: "inquiry_unassigned",
    label: "Unassigned public inquiry (ops-facing)",
    group: "Event alert",
    command: "/test_inquiry_unassigned",
    variables: ["customerName", "customerPhone", "serviceType", "pincode", "complaint"],
    defaultBody:
      "⚠️ <b>Unassigned Book Appointment Inquiry</b>\n\n<pre>\nCustomer      {{customerName}}\nPhone         {{customerPhone}}\nService type  {{serviceType}}\nPincode       {{pincode}}\nComplaint     {{complaint}}\n</pre>\n<i>No partner currently covers this area/service type — the customer was told to call in. Route this manually or ask a nearby partner to add this pincode to their Service Area.</i>",
  },
  {
    key: "contact_submitted",
    label: "Contact form submitted (ops-facing)",
    group: "Event alert",
    command: "/test_contact_submitted",
    variables: ["name", "email", "message"],
    defaultBody:
      "✉️ <b>New Contact Form Submission</b>\n\n<pre>\nName    {{name}}\nEmail   {{email}}\n</pre>\n{{message}}\n\n<i>Review it in /admin/contact-submissions.</i>",
  },
  {
    key: "new_partner_application",
    label: "New partner application (ops-facing)",
    group: "Event alert",
    command: "/test_new_partner_application",
    variables: ["businessName", "partnerTypeName"],
    defaultBody:
      "📋 <b>New Partner Application</b>\n\n<pre>\nBusiness      {{businessName}}\nPartner type  {{partnerTypeName}}\n</pre>",
  },
  {
    key: "general_announcement",
    label: "General announcement",
    group: "Event alert",
    command: "/announce",
    variables: ["text"],
    defaultBody: "📢 <b>Announcement</b>\n\n{{text}}",
  },
  {
    key: "pna_report",
    label: "Parts Not Available report",
    group: "System",
    command: "/pna_report",
    variables: ["businessName", "totalOpen", "totalQty", "lines"],
    defaultBody:
      "🧩 <b>{{businessName}} — Parts Not Available</b>\n\nOpen entries: {{totalOpen}} · Total qty needed: {{totalQty}}\n\n{{lines}}",
  },
  {
    key: "report_daily",
    label: "Daily business report",
    group: "Business report",
    command: "/report_daily",
    variables: ["businessName", "revenue", "priorRevenue", "invoiceCount", "priorInvoiceCount", "workorderCount", "priorWorkorderCount", "changePct", "trendLine"],
    defaultBody:
      "📊 <b>{{businessName}} — Daily Report</b>\n\n<pre>\nRevenue          {{revenue}} (prior {{priorRevenue}})\nInvoices         {{invoiceCount}} (prior {{priorInvoiceCount}})\nWorkorders       {{workorderCount}} (prior {{priorWorkorderCount}})\nChange           {{changePct}}\n</pre>\n\n{{trendLine}}",
  },
  {
    key: "report_weekly",
    label: "Weekly business report",
    group: "Business report",
    command: "/report_weekly",
    variables: ["businessName", "revenue", "priorRevenue", "invoiceCount", "priorInvoiceCount", "workorderCount", "priorWorkorderCount", "changePct", "trendLine"],
    defaultBody:
      "📈 <b>{{businessName}} — Weekly Report</b>\n\n<pre>\nRevenue          {{revenue}} (prior {{priorRevenue}})\nInvoices         {{invoiceCount}} (prior {{priorInvoiceCount}})\nWorkorders       {{workorderCount}} (prior {{priorWorkorderCount}})\nChange           {{changePct}}\n</pre>\n\n{{trendLine}}",
  },
  {
    key: "report_monthly",
    label: "Monthly business report",
    group: "Business report",
    command: "/report_monthly",
    variables: ["businessName", "revenue", "priorRevenue", "invoiceCount", "priorInvoiceCount", "workorderCount", "priorWorkorderCount", "changePct", "trendLine"],
    defaultBody:
      "🗓️ <b>{{businessName}} — Monthly Report</b>\n\n<pre>\nRevenue          {{revenue}} (prior {{priorRevenue}})\nInvoices         {{invoiceCount}} (prior {{priorInvoiceCount}})\nWorkorders       {{workorderCount}} (prior {{priorWorkorderCount}})\nChange           {{changePct}}\n</pre>\n\n{{trendLine}}",
  },
  {
    key: "customer_data_otp",
    label: "Customer data access — verification code",
    group: "System",
    // Not a real bot command like every other row here — this is only ever
    // sent app-side (requestCustomerDataOtp, src/lib/customerDataAccess.ts)
    // when a partner clicks "Send code" on the Customers page, never on
    // demand from within the chat itself.
    command: "(sent from the app, not a chat command)",
    variables: ["code"],
    defaultBody: "🔒 <b>Customer data access code</b>\n\n<pre>\n{{code}}\n</pre>\n\nEnter this in the app to view/export your Customer database. Expires in 5 minutes. Didn't request this? Ignore it.",
  },
  {
    key: "connect_confirmation",
    label: "Chat connected confirmation",
    group: "System",
    command: "/start",
    variables: ["slotLabel"],
    defaultBody: "✅ Connected! This chat will now receive your {{slotLabel}} Telegram alerts.",
  },
  {
    key: "test_message",
    label: "Test message (Send Test Message button)",
    group: "System",
    command: "/test",
    variables: ["businessName"],
    defaultBody: "🔔 Test message from {{businessName}}'s My Biz Flow account — Telegram alerts are working.",
  },
  {
    key: "help",
    label: "Help / command list",
    group: "System",
    command: "/help",
    variables: ["commandList"],
    defaultBody: "🤖 <b>Available commands</b>\n\n{{commandList}}",
  },
  {
    key: "wholesale_large_order",
    label: "Wholesale B2B: large order placed",
    group: "Event alert",
    command: "/test_wholesale_large_order",
    variables: ["businessName", "orderNumber", "customerName", "amount"],
    defaultBody:
      "📦 <b>Wholesale Order Placed — {{businessName}}</b>\n\n<pre>\nOrder         {{orderNumber}}\nCustomer      {{customerName}}\nAmount        {{amount}}\n</pre>",
  },
  {
    key: "wholesale_credit_limit_breach",
    label: "Wholesale B2B: credit limit breach blocked",
    group: "Event alert",
    command: "/test_wholesale_credit_limit_breach",
    variables: ["businessName", "customerName", "amount", "outstanding", "creditLimit"],
    defaultBody:
      "🚫 <b>Credit Limit Breach Blocked — {{businessName}}</b>\n\n<pre>\nCustomer      {{customerName}}\nOrder amount  {{amount}}\nOutstanding   {{outstanding}}\nCredit limit  {{creditLimit}}\n</pre>\n<i>Order was blocked — it would have pushed this customer over their credit limit.</i>",
  },
  {
    key: "production_delayed",
    label: "Manufacturing: production order delayed",
    group: "Event alert",
    command: "/test_production_delayed",
    variables: ["businessName", "orderId", "productName", "quantityPlanned"],
    defaultBody:
      "⚠️ <b>Production Delayed — {{businessName}}</b>\n\n<pre>\nOrder         {{orderId}}\nProduct       {{productName}}\nPlanned Qty   {{quantityPlanned}}\n</pre>",
  },
  {
    key: "production_stock_shortfall",
    label: "Manufacturing: stock shortfall blocking production",
    group: "Event alert",
    command: "/test_production_stock_shortfall",
    variables: ["businessName", "orderId", "productName", "materialLabel", "available", "required"],
    defaultBody:
      "🛑 <b>Production Blocked — Stock Shortfall — {{businessName}}</b>\n\n<pre>\nOrder         {{orderId}}\nProduct       {{productName}}\nMaterial      {{materialLabel}}\nAvailable     {{available}}\nRequired      {{required}}\n</pre>",
  },
  {
    key: "production_completed",
    label: "Manufacturing: production completed",
    group: "Event alert",
    command: "/test_production_completed",
    variables: ["businessName", "orderId", "productName", "quantityProduced", "totalCost"],
    defaultBody:
      "✅ <b>Production Completed — {{businessName}}</b>\n\n<pre>\nOrder         {{orderId}}\nProduct       {{productName}}\nQty Produced  {{quantityProduced}}\nTotal Cost    {{totalCost}}\n</pre>",
  },
  {
    key: "event_booking_confirmed",
    label: "Event booking confirmed",
    group: "Event alert",
    command: "/test_event_booking_confirmed",
    variables: ["businessName", "eventName", "bookingId"],
    defaultBody:
      "🎉 <b>Event Confirmed — {{businessName}}</b>\n\n<pre>\nEvent         {{eventName}}\nBooking       {{bookingId}}\n</pre>",
  },
  {
    key: "event_starting_soon",
    label: "Event starting soon",
    group: "Event alert",
    command: "/test_event_starting_soon",
    variables: ["businessName", "eventName", "bookingId", "startAt"],
    defaultBody:
      "⏰ <b>Event Starting Soon — {{businessName}}</b>\n\n<pre>\nEvent         {{eventName}}\nBooking       {{bookingId}}\nStarts        {{startAt}}\n</pre>",
  },
  {
    key: "event_payment_received",
    label: "Event payment received",
    group: "Event alert",
    command: "/test_event_payment_received",
    variables: ["businessName", "eventName", "bookingId", "amount", "totalPaid"],
    defaultBody:
      "💰 <b>Event Payment Received — {{businessName}}</b>\n\n<pre>\nEvent         {{eventName}}\nBooking       {{bookingId}}\nAmount        {{amount}}\nTotal paid    {{totalPaid}}\n</pre>",
  },
  {
    key: "legal_court_date_upcoming",
    label: "Legal: upcoming court date",
    group: "Event alert",
    command: "/test_legal_court_date_upcoming",
    variables: ["businessName", "matterNumber", "title", "courtDate"],
    defaultBody:
      "⚖️ <b>Upcoming Court Date — {{businessName}}</b>\n\n<pre>\nMatter        {{matterNumber}}\nTitle         {{title}}\nCourt date    {{courtDate}}\n</pre>",
  },
  {
    key: "legal_matter_status_changed",
    label: "Legal: matter status changed",
    group: "Event alert",
    command: "/test_legal_matter_status_changed",
    variables: ["businessName", "matterNumber", "title", "prevStatus", "nextStatus"],
    defaultBody:
      "📁 <b>Matter Status Changed — {{businessName}}</b>\n\n<pre>\nMatter        {{matterNumber}}\nTitle         {{title}}\nStatus        {{prevStatus}} → {{nextStatus}}\n</pre>",
  },
  {
    key: "education_fee_overdue",
    label: "Education: fee installment overdue",
    group: "Event alert",
    command: "/test_education_fee_overdue",
    variables: ["businessName", "studentName", "installmentLabel", "dueDate", "amount"],
    defaultBody:
      "⏰ <b>Fee Installment Overdue — {{businessName}}</b>\n\n<pre>\nStudent       {{studentName}}\nInstallment   {{installmentLabel}}\nDue date      {{dueDate}}\nAmount        {{amount}}\n</pre>",
  },
  {
    key: "education_batch_starting",
    label: "Education: batch starting",
    group: "Event alert",
    command: "/test_education_batch_starting",
    variables: ["businessName", "batchName", "courseName", "startDate"],
    defaultBody:
      "🗓️ <b>Batch Starting — {{businessName}}</b>\n\n<pre>\nBatch         {{batchName}}\nCourse        {{courseName}}\nStarts        {{startDate}}\n</pre>",
  },
  {
    key: "education_enrollment_confirmed",
    label: "Education: enrollment confirmed",
    group: "Event alert",
    command: "/test_education_enrollment_confirmed",
    variables: ["businessName", "studentName", "batchName", "courseName"],
    defaultBody:
      "🎓 <b>Enrollment Confirmed — {{businessName}}</b>\n\n<pre>\nStudent       {{studentName}}\nBatch         {{batchName}}\nCourse        {{courseName}}\n</pre>",
  },
  {
    key: "hrms_late_check_in",
    label: "HRMS: late / blocked check-in",
    group: "Event alert",
    command: "/test_hrms_late_check_in",
    variables: ["businessName", "employeeName", "nearestOfficeInfo"],
    defaultBody:
      "🚫 <b>Check-in Blocked — {{businessName}}</b>\n\n<pre>\nEmployee      {{employeeName}}\n</pre>\n<i>Attempted to check in outside every registered office's geofence.{{nearestOfficeInfo}}</i>",
  },
  {
    key: "hrms_leave_request_submitted",
    label: "HRMS: leave request submitted",
    group: "Event alert",
    command: "/test_hrms_leave_request_submitted",
    variables: ["businessName", "employeeName", "leaveType", "startDate", "endDate"],
    defaultBody:
      "📝 <b>Leave Request Submitted — {{businessName}}</b>\n\n<pre>\nEmployee      {{employeeName}}\nLeave type    {{leaveType}}\nFrom          {{startDate}}\nTo            {{endDate}}\n</pre>",
  },
  {
    key: "hrms_leave_decided",
    label: "HRMS: leave request approved/rejected",
    group: "Event alert",
    command: "/test_hrms_leave_decided",
    variables: ["businessName", "employeeName", "leaveType", "startDate", "endDate", "decision"],
    defaultBody:
      "✅ <b>Leave Request {{decision}} — {{businessName}}</b>\n\n<pre>\nEmployee      {{employeeName}}\nLeave type    {{leaveType}}\nFrom          {{startDate}}\nTo            {{endDate}}\n</pre>",
  },
  {
    key: "hrms_payroll_completed",
    label: "HRMS: payroll run completed",
    group: "Event alert",
    command: "/test_hrms_payroll_completed",
    variables: ["businessName", "employeeName", "month", "year", "netPay"],
    defaultBody:
      "💵 <b>Payroll Finalized — {{businessName}}</b>\n\n<pre>\nEmployee      {{employeeName}}\nPeriod        {{month}}/{{year}}\nNet Pay       {{netPay}}\n</pre>",
  },
  {
    key: "marketplace_new_order",
    label: "Marketplace: new order placed",
    group: "Event alert",
    command: "/test_marketplace_new_order",
    variables: ["businessName", "listingTitle", "quantity", "customerName", "totalAmount"],
    defaultBody:
      "🛒 <b>New Marketplace Order — {{businessName}}</b>\n\n<pre>\nListing       {{listingTitle}}\nQty           {{quantity}}\nCustomer      {{customerName}}\nTotal         {{totalAmount}}\n</pre>",
  },
  {
    key: "marketplace_vendor_payout",
    label: "Marketplace: vendor payout",
    group: "Event alert",
    command: "/test_marketplace_vendor_payout",
    variables: ["businessName", "vendorName", "amount"],
    defaultBody:
      "💸 <b>Vendor Payout — {{businessName}}</b>\n\n<pre>\nVendor        {{vendorName}}\nAmount        {{amount}}\n</pre>",
  },
];

export function findTelegramTemplateDef(key: string): TelegramTemplateDef | undefined {
  return TELEGRAM_TEMPLATE_DEFS.find((d) => d.key === key);
}

export function findTelegramTemplateDefByCommand(command: string): TelegramTemplateDef | undefined {
  const head = command.split(/\s/)[0].toLowerCase();
  return TELEGRAM_TEMPLATE_DEFS.find((d) => d.command.toLowerCase() === head);
}
