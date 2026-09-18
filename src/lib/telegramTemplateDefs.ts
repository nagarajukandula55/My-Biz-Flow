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
];

export function findTelegramTemplateDef(key: string): TelegramTemplateDef | undefined {
  return TELEGRAM_TEMPLATE_DEFS.find((d) => d.key === key);
}

export function findTelegramTemplateDefByCommand(command: string): TelegramTemplateDef | undefined {
  const head = command.split(/\s/)[0].toLowerCase();
  return TELEGRAM_TEMPLATE_DEFS.find((d) => d.command.toLowerCase() === head);
}
