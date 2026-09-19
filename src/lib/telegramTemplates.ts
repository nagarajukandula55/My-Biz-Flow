/**
 * Telegram message CONTENT builders — plain async functions returning
 * message text only, no fetch()/API call here (that lives in
 * src/lib/telegram.ts's sendPartnerTelegramAlert/sendWorkorderTelegramAlert/
 * sendPartnerTelegramReport, called from action sites and from
 * /api/cron/telegram-reports for the scheduled digest, and from
 * src/app/api/telegram/webhook/route.ts for command-triggered sends).
 * Delivery still needs a real bot token (TELEGRAM_BOT_TOKEN) configured on
 * the deployment.
 *
 * Each builder below loads its template body from
 * telegramTemplatesData.ts (a Prisma-backed admin override, falling back to
 * the code default in telegramTemplateDefs.ts — that file is the canonical
 * catalog of every template key/command/variables/default text) and fills
 * in {{token}} placeholders with the live values passed in. Editing a
 * template's wording is a My Biz Flow Admin action (a separate
 * repo/deployment — see src/app/admin/(protected)/telegram/page.tsx there);
 * this file only ever reads.
 */
import { getTelegramTemplateBody, renderTelegramTemplate } from "@/lib/telegramTemplatesData";

/** Falls back to an em dash for any optional workorder field a caller
 * doesn't have (e.g. a job logged with no brand/model yet) — renderTelegramTemplate
 * already blanks unknown tokens, but an em dash reads better than a blank
 * table cell in the fixed-width <pre> block every workorder template uses. */
function dash(value: string | undefined | null): string {
  const v = (value ?? "").trim();
  return v || "—";
}

/** New Service Centre workorder created. */
export async function newWorkorderCreatedMessage(opts: {
  partnerBusinessName: string;
  workorderNumber: string;
  customerName: string;
  customerPhone?: string;
  deviceCategory?: string;
  brandName?: string;
  modelName?: string;
  imeiOrSerialNumber?: string;
  faultDescription?: string;
  priority?: string;
  loggedBy?: string;
  receivedDate?: string;
  estimatedAmount?: string;
  warrantyStatus?: string;
}): Promise<string> {
  const body = await getTelegramTemplateBody("new_workorder");
  return renderTelegramTemplate(body, {
    businessName: opts.partnerBusinessName,
    workorderNumber: opts.workorderNumber,
    customerName: opts.customerName,
    customerPhone: dash(opts.customerPhone),
    deviceCategory: dash(opts.deviceCategory),
    brandName: dash(opts.brandName),
    modelName: dash(opts.modelName),
    imeiOrSerialNumber: dash(opts.imeiOrSerialNumber),
    faultDescription: dash(opts.faultDescription),
    priority: dash(opts.priority),
    loggedBy: dash(opts.loggedBy),
    receivedDate: dash(opts.receivedDate),
    estimatedAmount: dash(opts.estimatedAmount),
    warrantyStatus: dash(opts.warrantyStatus),
  });
}

/** A workorder was closed/invoiced. */
export async function workorderClosedMessage(opts: {
  partnerBusinessName: string;
  workorderNumber: string;
  amount: string;
  customerName?: string;
  customerPhone?: string;
  brandName?: string;
  modelName?: string;
  engineerName?: string;
  warrantyStatus?: string;
  remark?: string;
}): Promise<string> {
  const body = await getTelegramTemplateBody("workorder_closed");
  return renderTelegramTemplate(body, {
    businessName: opts.partnerBusinessName,
    workorderNumber: opts.workorderNumber,
    amount: opts.amount,
    customerName: dash(opts.customerName),
    customerPhone: dash(opts.customerPhone),
    brandName: dash(opts.brandName),
    modelName: dash(opts.modelName),
    engineerName: dash(opts.engineerName),
    warrantyStatus: dash(opts.warrantyStatus),
    remark: dash(opts.remark),
  });
}

/** A workorder was cancelled. */
export async function workorderCancelledMessage(opts: {
  partnerBusinessName: string;
  workorderNumber: string;
  reason?: string;
  customerName?: string;
  customerPhone?: string;
  brandName?: string;
  modelName?: string;
  loggedBy?: string;
  receivedDate?: string;
}): Promise<string> {
  const body = await getTelegramTemplateBody("workorder_cancelled");
  return renderTelegramTemplate(body, {
    businessName: opts.partnerBusinessName,
    workorderNumber: opts.workorderNumber,
    reason: dash(opts.reason),
    customerName: dash(opts.customerName),
    customerPhone: dash(opts.customerPhone),
    brandName: dash(opts.brandName),
    modelName: dash(opts.modelName),
    loggedBy: dash(opts.loggedBy),
    receivedDate: dash(opts.receivedDate),
  });
}

/** A subscription payment was confirmed. */
export async function paymentReceivedMessage(opts: {
  partnerBusinessName: string;
  amount: string;
  planName?: string;
}): Promise<string> {
  const body = await getTelegramTemplateBody("payment_received");
  return renderTelegramTemplate(body, {
    businessName: opts.partnerBusinessName,
    amount: opts.amount,
    planName: opts.planName ?? "—",
  });
}

/** A subscription invoice is due/overdue. */
export async function paymentDueMessage(opts: {
  partnerBusinessName: string;
  amount: string;
  dueDate: string;
}): Promise<string> {
  const body = await getTelegramTemplateBody("payment_due");
  return renderTelegramTemplate(body, {
    businessName: opts.partnerBusinessName,
    amount: opts.amount,
    dueDate: opts.dueDate,
  });
}

/** Trial or paid subscription is about to expire. */
export async function subscriptionExpiringMessage(opts: {
  partnerBusinessName: string;
  expiresOn: string;
  planName?: string;
}): Promise<string> {
  const body = await getTelegramTemplateBody("subscription_expiring");
  return renderTelegramTemplate(body, {
    businessName: opts.partnerBusinessName,
    expiresOn: opts.expiresOn,
    planName: opts.planName ?? "—",
  });
}

/** A material/part fell below its reorder threshold. */
export async function lowStockAlertMessage(opts: {
  partnerBusinessName: string;
  itemName: string;
  quantityRemaining: number;
  reorderThreshold: number;
}): Promise<string> {
  const body = await getTelegramTemplateBody("low_stock");
  return renderTelegramTemplate(body, {
    businessName: opts.partnerBusinessName,
    itemName: opts.itemName,
    quantityRemaining: String(opts.quantityRemaining),
    reorderThreshold: String(opts.reorderThreshold),
  });
}

/** A part on a workorder was marked Not Available — see createPnaEntryAction. */
export async function pnaLoggedMessage(opts: {
  partnerBusinessName: string;
  workorderId: string;
  materialLabel: string;
  qty: number;
  customerName?: string;
  brandJobNo?: string;
}): Promise<string> {
  const body = await getTelegramTemplateBody("pna_logged");
  return renderTelegramTemplate(body, {
    businessName: opts.partnerBusinessName,
    workorderId: opts.workorderId,
    materialLabel: opts.materialLabel,
    qty: String(opts.qty),
    customerName: dash(opts.customerName),
    brandJobNo: dash(opts.brandJobNo),
  });
}

/** On-demand "/pna_report" pull — real current Parts Not Available data (see computePnaTelegramReport, analyticsData.ts), same "real data on demand" pattern report_daily/weekly/monthly already use. */
export async function pnaReportMessage(opts: {
  partnerBusinessName: string;
  totalOpen: number;
  totalQty: number;
  lines: string;
}): Promise<string> {
  const body = await getTelegramTemplateBody("pna_report");
  return renderTelegramTemplate(body, {
    businessName: opts.partnerBusinessName,
    totalOpen: String(opts.totalOpen),
    totalQty: String(opts.totalQty),
    lines: opts.lines,
  });
}

/** A new public Book Appointment inquiry was auto-assigned to this partner. */
export async function inquiryAssignedMessage(opts: {
  partnerBusinessName: string;
  inquiryNumber: string;
  customerName: string;
  customerPhone: string;
  serviceType: string;
  complaint: string;
}): Promise<string> {
  const body = await getTelegramTemplateBody("inquiry_assigned");
  return renderTelegramTemplate(body, {
    businessName: opts.partnerBusinessName,
    inquiryNumber: opts.inquiryNumber,
    customerName: opts.customerName,
    customerPhone: opts.customerPhone,
    serviceType: opts.serviceType,
    complaint: opts.complaint,
  });
}

/** A public Book Appointment inquiry couldn't be matched to any partner — ops-facing, so it doesn't silently vanish. */
export async function inquiryUnassignedMessage(opts: {
  customerName: string;
  customerPhone: string;
  serviceType: string;
  pincode: string;
  complaint: string;
}): Promise<string> {
  const body = await getTelegramTemplateBody("inquiry_unassigned");
  return renderTelegramTemplate(body, {
    customerName: opts.customerName,
    customerPhone: opts.customerPhone,
    serviceType: opts.serviceType,
    pincode: opts.pincode,
    complaint: opts.complaint,
  });
}

/** The public marketing site's Contact Us form was submitted — ops-facing. */
export async function contactSubmittedMessage(opts: { name: string; email: string; message: string }): Promise<string> {
  const body = await getTelegramTemplateBody("contact_submitted");
  return renderTelegramTemplate(body, { name: opts.name, email: opts.email, message: opts.message });
}

/** A new partner application was submitted — ops-facing. */
export async function newPartnerApplicationMessage(opts: {
  businessName: string;
  partnerTypeName: string;
}): Promise<string> {
  const body = await getTelegramTemplateBody("new_partner_application");
  return renderTelegramTemplate(body, {
    businessName: opts.businessName,
    partnerTypeName: opts.partnerTypeName,
  });
}

/** One-off announcement or manual message sent by staff. */
export async function generalAnnouncementMessage(text: string): Promise<string> {
  const body = await getTelegramTemplateBody("general_announcement");
  return renderTelegramTemplate(body, { text });
}

export type ReportFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

const REPORT_TEMPLATE_KEY: Record<ReportFrequency, string> = {
  DAILY: "report_daily",
  WEEKLY: "report_weekly",
  MONTHLY: "report_monthly",
};

const REPORT_PERIOD_LABEL: Record<ReportFrequency, string> = {
  DAILY: "today",
  WEEKLY: "this week",
  MONTHLY: "this month",
};

/** Periodic revenue/activity business-summary digest for a partner's ops group/DM. */
export async function businessReportMessage(opts: {
  partnerBusinessName: string;
  frequency: ReportFrequency;
  revenue: string;
  priorRevenue: string;
  invoiceCount: number;
  priorInvoiceCount: number;
  workorderCount: number;
  priorWorkorderCount: number;
  changePct: string;
}): Promise<string> {
  const body = await getTelegramTemplateBody(REPORT_TEMPLATE_KEY[opts.frequency]);
  const changeUp = opts.changePct !== "n/a" && Number(opts.changePct.replace("%", "")) >= 0;
  return renderTelegramTemplate(body, {
    businessName: opts.partnerBusinessName,
    revenue: opts.revenue,
    priorRevenue: opts.priorRevenue,
    invoiceCount: String(opts.invoiceCount),
    priorInvoiceCount: String(opts.priorInvoiceCount),
    workorderCount: String(opts.workorderCount),
    priorWorkorderCount: String(opts.priorWorkorderCount),
    changePct: opts.changePct,
    trendLine: `${changeUp ? "✅" : "⚠️"} Revenue ${changeUp ? "up" : "down"} vs prior ${REPORT_PERIOD_LABEL[opts.frequency]}`,
  });
}

/** Sent automatically when a chat completes the /start deep-link connect flow. */
export async function connectConfirmationMessage(slotLabel: string): Promise<string> {
  const body = await getTelegramTemplateBody("connect_confirmation");
  return renderTelegramTemplate(body, { slotLabel });
}

/** The "Send Test Message" button, and the /test bot command. */
export async function testMessageText(businessName: string): Promise<string> {
  const body = await getTelegramTemplateBody("test_message");
  return renderTelegramTemplate(body, { businessName });
}

/** The /help bot command's reply. */
export async function helpMessageText(commandList: string): Promise<string> {
  const body = await getTelegramTemplateBody("help");
  return renderTelegramTemplate(body, { commandList });
}
