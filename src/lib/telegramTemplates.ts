/**
 * Telegram message CONTENT templates — plain functions returning message
 * text only. NOT YET SENT ANYWHERE: there is no Telegram bot/integration
 * wired up in My Biz Flow (no TELEGRAM_BOT_TOKEN, no sendTelegramMessage()
 * equivalent, no webhook). This file exists purely so the copy/tone/
 * structure is ready to reuse once a real bot integration is added later —
 * do not add any fetch()/API call here, that's future work.
 *
 * Adapted from AN-CRM's real Telegram templates (src/core/telegram/
 * vendorMessageTypes.ts's VENDOR_TELEGRAM_MESSAGE_TYPES catalog +
 * src/lib/telegramReport.ts's boxed-card report format), rewritten for My
 * Biz Flow's own occasions and branding — not pasted verbatim. Agreement/
 * e-signature-related trigger types are out of scope and skipped.
 *
 * Two families, matching AN-CRM's own split:
 *   - Notification templates: one-off event alerts (ops/staff-facing,
 *     routed to an internal Telegram group/DM, NOT the partner's customer).
 *   - Report templates: the boxed-card periodic business-summary digest.
 *
 * HTML formatting below (<b>, <pre>) matches Telegram's own supported
 * parse_mode="HTML" subset, same as AN-CRM's sendTelegramMessage() calls,
 * so this text can be sent as-is once a bot is wired up.
 */

function card(emoji: string, title: string, rows: { label: string; value: string }[], footer?: string): string {
  const lines = [`${emoji} <b>${title}</b>`, "", "<pre>"];
  for (const r of rows) lines.push(`${r.label.padEnd(16)} ${r.value}`);
  lines.push("</pre>");
  if (footer) lines.push("", footer);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Notification templates — one-off ops/staff-facing event alerts.
// ---------------------------------------------------------------------------

/** New Service Centre workorder assigned/created — equivalent of AN-CRM's NEW_WORKORDER type. */
export function newWorkorderAssignedMessage(opts: {
  partnerBusinessName: string;
  workorderNumber: string;
  customerName: string;
  technicianName?: string;
}): string {
  return card("🆕", `${opts.partnerBusinessName} — New Workorder`, [
    { label: "Workorder", value: opts.workorderNumber },
    { label: "Customer", value: opts.customerName },
    ...(opts.technicianName ? [{ label: "Assigned to", value: opts.technicianName }] : []),
  ]);
}

/** A workorder was closed/invoiced — equivalent of AN-CRM's WORKORDER_CLOSED type. */
export function workorderClosedMessage(opts: {
  partnerBusinessName: string;
  workorderNumber: string;
  amount: string;
}): string {
  return card("✅", `${opts.partnerBusinessName} — Workorder Closed`, [
    { label: "Workorder", value: opts.workorderNumber },
    { label: "Invoiced", value: opts.amount },
  ]);
}

/** A workorder was cancelled — equivalent of AN-CRM's WORKORDER_CANCELLED type. */
export function workorderCancelledMessage(opts: {
  partnerBusinessName: string;
  workorderNumber: string;
  reason?: string;
}): string {
  return card("🚫", `${opts.partnerBusinessName} — Workorder Cancelled`, [
    { label: "Workorder", value: opts.workorderNumber },
    ...(opts.reason ? [{ label: "Reason", value: opts.reason }] : []),
  ]);
}

/** A subscription payment was confirmed — equivalent of AN-CRM's PAYMENT_RECEIVED type. */
export function paymentReceivedMessage(opts: {
  partnerBusinessName: string;
  amount: string;
  planName?: string;
}): string {
  return card("💰", `${opts.partnerBusinessName} — Payment Received`, [
    { label: "Amount", value: opts.amount },
    ...(opts.planName ? [{ label: "Plan", value: opts.planName }] : []),
  ]);
}

/** A subscription invoice is due/overdue — equivalent of AN-CRM's PAYMENT_DUE type. */
export function paymentDueMessage(opts: {
  partnerBusinessName: string;
  amount: string;
  dueDate: string;
}): string {
  return card("⏰", `${opts.partnerBusinessName} — Payment Due`, [
    { label: "Amount", value: opts.amount },
    { label: "Due", value: opts.dueDate },
  ]);
}

/** Trial or paid subscription is about to expire — equivalent of AN-CRM's SUBSCRIPTION_EXPIRY type. */
export function subscriptionExpiringMessage(opts: {
  partnerBusinessName: string;
  expiresOn: string;
  planName?: string;
}): string {
  return card("⚠️", `${opts.partnerBusinessName} — Subscription Expiring`, [
    { label: "Expires", value: opts.expiresOn },
    ...(opts.planName ? [{ label: "Plan", value: opts.planName }] : []),
  ]);
}

/** A material/part fell below its reorder threshold — equivalent of AN-CRM's LOW_STOCK type. */
export function lowStockAlertMessage(opts: {
  partnerBusinessName: string;
  itemName: string;
  quantityRemaining: number;
  reorderThreshold: number;
}): string {
  return card("📉", `${opts.partnerBusinessName} — Low Stock`, [
    { label: "Item", value: opts.itemName },
    { label: "Remaining", value: String(opts.quantityRemaining) },
    { label: "Threshold", value: String(opts.reorderThreshold) },
  ]);
}

/** A new partner application was submitted — the ops-facing counterpart of sendPartnerApplicationReceivedEmail. */
export function newPartnerApplicationMessage(opts: {
  businessName: string;
  partnerTypeName: string;
}): string {
  return card("📋", "New Partner Application", [
    { label: "Business", value: opts.businessName },
    { label: "Partner type", value: opts.partnerTypeName },
  ]);
}

/** One-off announcement or manual message sent by staff — equivalent of AN-CRM's GENERAL_ANNOUNCEMENT type. */
export function generalAnnouncementMessage(text: string): string {
  return `📢 <b>Announcement</b>\n\n${text}`;
}

// ---------------------------------------------------------------------------
// Report templates — periodic boxed-card business-summary digest, matching
// AN-CRM's buildReportMessage() layout (src/lib/telegramReport.ts).
// ---------------------------------------------------------------------------

export type ReportFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

const REPORT_META: Record<ReportFrequency, { emoji: string; label: string; tableTitle: string }> = {
  DAILY: { emoji: "📊", label: "Daily Report", tableTitle: "Today" },
  WEEKLY: { emoji: "📈", label: "Weekly Report", tableTitle: "This Week" },
  MONTHLY: { emoji: "🗓️", label: "Monthly Report", tableTitle: "This Month" },
};

/** Periodic revenue/activity business-summary digest for a partner's ops group/DM. */
export function businessReportMessage(opts: {
  partnerBusinessName: string;
  frequency: ReportFrequency;
  revenue: string;
  priorRevenue: string;
  invoiceCount: number;
  priorInvoiceCount: number;
  workorderCount: number;
  priorWorkorderCount: number;
  changePct: string;
}): string {
  const meta = REPORT_META[opts.frequency];
  const changeUp = opts.changePct !== "n/a" && Number(opts.changePct.replace("%", "")) >= 0;
  return card(
    meta.emoji,
    `${opts.partnerBusinessName} — ${meta.label}`,
    [
      { label: "Revenue", value: `${opts.revenue} (prior ${opts.priorRevenue})` },
      { label: "Invoices", value: `${opts.invoiceCount} (prior ${opts.priorInvoiceCount})` },
      { label: "Workorders", value: `${opts.workorderCount} (prior ${opts.priorWorkorderCount})` },
      { label: "Change", value: opts.changePct },
    ],
    `${changeUp ? "✅" : "⚠️"} Revenue ${changeUp ? "up" : "down"} vs prior ${meta.tableTitle.toLowerCase()}`
  );
}
