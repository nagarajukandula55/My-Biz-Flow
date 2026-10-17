import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getPartner } from "@/lib/partnerData";
import { getBusinessRecord } from "@/lib/businessRecords";
import {
  connectTelegramChat,
  findWorkorderByReplyMessageId,
  appendTelegramChatLogEntry,
  parseStartPayload,
  findPartnerIdByChatId,
  sendRawTelegramMessage,
  getTelegramSettings,
  listPartnersWithReportsEnabled,
  setTelegramCommands,
} from "@/lib/telegram";
import { findTelegramTemplateDefByCommand, TELEGRAM_TEMPLATE_DEFS } from "@/lib/telegramTemplateDefs";
import { getTelegramTemplateBody, renderTelegramTemplate } from "@/lib/telegramTemplatesData";
import { businessReportMessage, helpMessageText, connectConfirmationMessage, pnaReportMessage, generalAnnouncementMessage, type ReportFrequency } from "@/lib/telegramTemplates";
import { computePartnerReportComparison } from "@/lib/telegramReportData";
import { getVisibleModuleSlugs } from "@/lib/designer/entitlements";
import { runTelegramReportsNow } from "@/lib/telegramReportRunner";
import {
  computePnaTelegramReport,
  getServiceCentreOverview,
  getInquiryOverview,
  getInvoiceStatusBreakdown,
  getAverageTat,
} from "@/lib/analyticsData";
import { computeAlerts } from "@/lib/alerts";
import { findSupportTicketByReplyMessageId, appendSupportReply, setSupportTicketStatus } from "@/lib/supportTickets";
import { getAdminChatIds } from "@/lib/platformSettings";
import { getReportRuns } from "@/lib/reportRunLog";
import { getPlan } from "@/lib/plansData";
import { assertPartnerCanWrite } from "@/lib/tenant";

function istTimestamp(d: Date): string {
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
}

function formatInr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

/**
 * The Telegram-native "/" autocomplete menu (setTelegramCommands —
 * src/lib/telegram.ts), kept separate from TELEGRAM_TEMPLATE_DEFS/
 * LIVE_DATA_COMMANDS since the menu is deliberately curated (no /test_*
 * preview commands cluttering it) rather than a literal dump of every
 * handled command. PUBLIC_COMMANDS is what every chat sees; admin chats
 * (getAdminChatIds()) get ADMIN_COMMANDS instead — Telegram replaces the
 * whole per-chat list rather than merging it with the default, so
 * ADMIN_COMMANDS repeats every public command plus the admin-only ones.
 */
const PUBLIC_COMMANDS = [
  { command: "help", description: "List every command available to you" },
  { command: "tgid", description: "Get this chat's Telegram ID" },
  { command: "start", description: "Connect this chat to your My Biz Flow account" },
  { command: "test", description: "Send a test message to confirm alerts work" },
  { command: "report_daily", description: "Pull your current daily business report" },
  { command: "report_weekly", description: "Pull your current weekly business report" },
  { command: "report_monthly", description: "Pull your current monthly business report" },
  { command: "pna_report", description: "Parts Not Available report" },
  { command: "workorders", description: "Live open-workorder counts" },
  { command: "inquiries", description: "Open/converted/closed inquiry counts" },
  { command: "tat", description: "Average turnaround time (closed jobs)" },
  { command: "invoices", description: "Invoice counts by payment status" },
  { command: "lowstock", description: "Items at or below reorder level" },
  { command: "subscription", description: "Your plan and expiry status" },
];
const ADMIN_COMMANDS = [
  ...PUBLIC_COMMANDS,
  { command: "status", description: "[Admin] Telegram report cron health" },
  { command: "sendreport", description: "[Admin] Trigger due reports now" },
  { command: "announce", description: "[Admin] Broadcast to all partners" },
  { command: "syncmenu", description: "[Admin] Re-sync this \"/\" command menu" },
];

/** Same HTML-escaping convention as errorLog.ts's own escapeHtml — messages
 * are sent with parse_mode: "HTML" (see sendRawTelegramMessage), so raw
 * operator-typed text must be escaped before it's interpolated into a
 * template, or `<`/`&` in the announcement could break formatting or be
 * misread as markup. */
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Sample values for a /test_* command preview — same shape as the real
 * template variables, but fixed placeholder data since there's no real
 * event to pull from on demand. */
const SAMPLE_VARS: Record<string, string> = {
  businessName: "Sample Business",
  workorderNumber: "SC0001-000123",
  customerName: "Sample Customer",
  amount: "₹1,500",
  reason: "Customer cancelled",
  planName: "Pro",
  dueDate: "2026-09-20",
  expiresOn: "2026-09-30",
  itemName: "Sample Part",
  quantityRemaining: "2",
  reorderThreshold: "5",
  partnerTypeName: "Service Centre",
  text: "This is a sample announcement.",
};

/** Handles every non-/start bot command from telegramTemplateDefs.ts:
 * /report_daily|weekly|monthly pull that connected partner's real current
 * digest; /test_* commands preview a template with sample data; /help lists
 * every command. Returns true if `text` was a recognized command (caller
 * should stop processing the update either way once this returns). */
/** Lines for handleLiveDataCommand's commands, filtered to what this partner's modules actually support — used by both /help branches below. */
function liveDataCommandLines(modules: readonly string[]): string[] {
  const lines = ["/subscription — your plan and expiry status", "/lowstock — items currently at or below reorder level"];
  if (modules.includes("service-centre")) {
    lines.push(
      "/workorders — live open-workorder counts",
      "/inquiries — open/converted/closed inquiry counts",
      "/tat — average turnaround time (closed jobs)",
      "/note <workorder number> <text> — add a note to that workorder"
    );
  }
  if (modules.includes("billing")) {
    lines.push("/invoices — invoice counts by payment status");
  }
  return lines;
}

/**
 * A persistent reply-keyboard (tap-to-fill, see sendRawTelegramMessage's
 * replyKeyboard param) of this partner's top commands, attached to /help so
 * the most-used ones are one tap away instead of typed out — tapping a
 * button just sends that exact text, which goes through the exact same
 * dispatch as typing it. Deliberately a short curated set (not every
 * command) — a keyboard crammed with 30 buttons is worse than no keyboard.
 */
function partnerNativeCommands(modules: readonly string[]) {
  return PUBLIC_COMMANDS.filter(({ command }) =>
    !["pna_report", "workorders", "inquiries", "tat"].includes(command) || modules.includes("service-centre")
  ).filter(({ command }) => command !== "invoices" || modules.includes("billing"));
}

function quickReplyKeyboard(modules: readonly string[]): string[][] {
  const rows: string[][] = [["/help", "/tgid"]];
  const dataRow: string[] = ["/subscription"];
  if (modules.includes("service-centre")) dataRow.push("/workorders");
  if (modules.includes("billing")) dataRow.push("/invoices");
  rows.push(dataRow);
  rows.push(modules.includes("service-centre") ? ["/report_daily", "/pna_report"] : ["/report_daily"]);
  return rows;
}

async function handleTemplateCommand(chatId: string, text: string): Promise<boolean> {
  const head = text.trim().split(/\s/)[0];
  if (!head.startsWith("/")) return false;

  if (head.toLowerCase() === "/help") {
    const connectedId = await findPartnerIdByChatId(chatId);
    const modules = connectedId ? await getVisibleModuleSlugs(connectedId) : [];
    // Refresh this chat only; the default menu contains no vertical-specific commands.
    const adminChatIds = await getAdminChatIds();
    await setTelegramCommands(adminChatIds.includes(chatId) ? ADMIN_COMMANDS : partnerNativeCommands(modules), chatId);
    const commandList = TELEGRAM_TEMPLATE_DEFS.filter((d) => d.command !== "/start" && (d.key !== "pna_report" || modules.includes("service-centre")))
      .map((d) => `${d.command} — ${d.label}`)
      .join("\n") + "\n" + liveDataCommandLines(modules).join("\n") + "\n/tgid — this chat's Telegram id";
    await sendRawTelegramMessage(chatId, await helpMessageText(commandList), undefined, quickReplyKeyboard(modules));
    return true;
  }

  const def = findTelegramTemplateDefByCommand(head);
  if (!def) return false;

  const partnerId = await findPartnerIdByChatId(chatId);
  if (!partnerId) {
    await sendRawTelegramMessage(chatId, "This chat isn't connected to a My Biz Flow account yet — use the \"Connect Telegram\" link on your Telegram Alerts page first.");
    return true;
  }
  const partner = await getPartner(partnerId);
  if (!partner) {
    await sendRawTelegramMessage(chatId, "Couldn't find this account anymore.");
    return true;
  }

  if (def.key === "report_daily" || def.key === "report_weekly" || def.key === "report_monthly") {
    const frequency = def.key.replace("report_", "").toUpperCase() as ReportFrequency;
    const { current, prior, changePct } = await computePartnerReportComparison(partnerId, frequency, new Date());
    const message = await businessReportMessage({
      partnerBusinessName: partner.businessName,
      frequency,
      revenue: formatInr(current.revenue),
      priorRevenue: formatInr(prior.revenue),
      invoiceCount: current.invoiceCount,
      priorInvoiceCount: prior.invoiceCount,
      workorderCount: current.workorderCount,
      priorWorkorderCount: prior.workorderCount,
      changePct,
    });
    await sendRawTelegramMessage(chatId, message);
    return true;
  }

  if (def.key === "pna_report") {
    if (!(await getVisibleModuleSlugs(partnerId)).includes("service-centre")) {
      await sendRawTelegramMessage(chatId, "This command needs the Service Centre module. Use /help to see your commands.");
      return true;
    }
    const { totalOpen, totalQty, lines } = await computePnaTelegramReport(partnerId);
    const message = await pnaReportMessage({ partnerBusinessName: partner.businessName, totalOpen, totalQty, lines });
    await sendRawTelegramMessage(chatId, message);
    return true;
  }

  if (def.key === "test_message") {
    await sendRawTelegramMessage(chatId, renderTelegramTemplate(await getTelegramTemplateBody("test_message"), { businessName: partner.businessName }));
    return true;
  }

  // Every remaining command is a /test_* preview: render the template with
  // sample data plus this partner's real business name where relevant.
  const body = await getTelegramTemplateBody(def.key);
  const vars: Record<string, string> = { ...SAMPLE_VARS, businessName: partner.businessName };
  await sendRawTelegramMessage(chatId, renderTelegramTemplate(body, vars));
  return true;
}

const LIVE_DATA_COMMANDS = new Set(["/workorders", "/invoices", "/lowstock", "/subscription", "/inquiries", "/tat", "/note"]);

/**
 * On-demand live-data pull commands — same connected-chat requirement as
 * handleTemplateCommand's /report_* and /pna_report, but these aren't templates
 * (no admin-editable body, nothing in telegramTemplateDefs.ts) since
 * there's no fixed copy to preview — they just read the same aggregation
 * functions the partner's own Dashboard/Analytics pages already use
 * (src/lib/analyticsData.ts, src/lib/alerts.ts) and format a plain-text
 * snapshot. Module-gated the same way handleTemplateCommand's event-alert
 * commands are (service-centre for workorders/inquiries/tat, billing for
 * invoices) — /subscription and /lowstock need no module gate: the former
 * reads the Partner row itself, the latter (via computeAlerts) harmlessly
 * returns nothing for a module that isn't enabled.
 */
async function handleLiveDataCommand(chatId: string, text: string, messageId?: number): Promise<boolean> {
  const head = text.trim().split(/\s/)[0].toLowerCase();
  if (!LIVE_DATA_COMMANDS.has(head)) return false;

  const partnerId = await findPartnerIdByChatId(chatId);
  if (!partnerId) {
    await sendRawTelegramMessage(chatId, "This chat isn't connected to a My Biz Flow account yet — use the \"Connect Telegram\" link on your Telegram Alerts page first.");
    return true;
  }
  const partner = await getPartner(partnerId);
  if (!partner) {
    await sendRawTelegramMessage(chatId, "Couldn't find this account anymore.");
    return true;
  }
  const modules = await getVisibleModuleSlugs(partnerId);

  if (head === "/workorders") {
    if (!modules.includes("service-centre")) {
      await sendRawTelegramMessage(chatId, "This command needs the Service Centre module. Use /help to see your commands.");
      return true;
    }
    const o = await getServiceCentreOverview(partnerId);
    await sendRawTelegramMessage(
      chatId,
      `📋 <b>${escapeHtml(partner.businessName)} — Workorders</b>\n\n<pre>\nOpen            ${o.openWorkorders}\nOverdue (SLA)   ${o.overdueWorkorders}\nPart pending    ${o.partPendingWorkorders}\nRepair done     ${o.repairCompletedWorkorders}\nClosed (month)  ${o.closedThisMonth}\nToday / Week    ${o.workordersToday} / ${o.workordersThisWeek}\nRevenue (month) ${formatInr(o.revenueThisMonth)}\n</pre>`
    );
    return true;
  }

  // /note <workorderNumber> <text> — adds a note to that workorder's
  // Telegram chat log, same storage/display as a reply-to-alert note
  // (appendTelegramChatLogEntry, surfaced on the workorder's own timeline
  // in-app) — this is for when the original alert has scrolled out of
  // reach and replying to it directly isn't practical.
  if (head === "/note") {
    if (!modules.includes("service-centre")) {
      await sendRawTelegramMessage(chatId, "This command needs the Service Centre module. Use /help to see your commands.");
      return true;
    }
    const rest = text.trim().slice(head.length).trim();
    const spaceIdx = rest.indexOf(" ");
    const workorderNumber = spaceIdx === -1 ? rest : rest.slice(0, spaceIdx);
    const noteText = spaceIdx === -1 ? "" : rest.slice(spaceIdx + 1).trim();
    if (!workorderNumber || !noteText) {
      await sendRawTelegramMessage(chatId, "Usage: /note <workorder number> <your note>");
      return true;
    }
    const workorder = await getBusinessRecord(partnerId, "service-centre", workorderNumber);
    if (!workorder) {
      await sendRawTelegramMessage(chatId, `Workorder "${escapeHtml(workorderNumber)}" not found.`);
      return true;
    }
    await assertPartnerCanWrite(partnerId);
    await appendTelegramChatLogEntry(partnerId, workorderNumber, { direction: "in", text: noteText, chatId, messageId });
    await sendRawTelegramMessage(chatId, `Note added to ${escapeHtml(workorderNumber)}.`);
    return true;
  }

  if (head === "/inquiries") {
    if (!modules.includes("service-centre")) {
      await sendRawTelegramMessage(chatId, "This command needs the Service Centre module. Use /help to see your commands.");
      return true;
    }
    const o = await getInquiryOverview(partnerId);
    await sendRawTelegramMessage(
      chatId,
      `📞 <b>${escapeHtml(partner.businessName)} — Inquiries</b>\n\n<pre>\nOpen         ${o.open}\nConverted    ${o.converted}\nClosed       ${o.closed}\nTotal        ${o.total}\nConversion   ${o.conversionRatePercent}%\n</pre>`
    );
    return true;
  }

  if (head === "/tat") {
    if (!modules.includes("service-centre")) {
      await sendRawTelegramMessage(chatId, "This command needs the Service Centre module. Use /help to see your commands.");
      return true;
    }
    const t = await getAverageTat(partnerId);
    await sendRawTelegramMessage(
      chatId,
      t.avgHours === undefined
        ? "No closed workorders yet — nothing to average."
        : `⏱️ <b>${escapeHtml(partner.businessName)} — Average Turnaround Time</b>\n\n<pre>\nAvg TAT      ${t.avgHours.toFixed(1)} hours\nClosed jobs  ${t.closedCount}\n</pre>`
    );
    return true;
  }

  if (head === "/invoices") {
    if (!modules.includes("billing")) {
      await sendRawTelegramMessage(chatId, "This command needs the Billing module. Use /help to see your commands.");
      return true;
    }
    const breakdown = await getInvoiceStatusBreakdown(partnerId);
    const lines = breakdown.length === 0 ? "No invoices yet." : breakdown.map((b) => `${b.name.padEnd(12)} ${b.value}`).join("\n");
    await sendRawTelegramMessage(chatId, `💳 <b>${escapeHtml(partner.businessName)} — Invoices by Status</b>\n\n<pre>\n${lines}\n</pre>`);
    return true;
  }

  if (head === "/lowstock") {
    const alerts = (await computeAlerts(partnerId)).filter((a) => a.title === "Low stock" || a.title === "Out of stock");
    if (alerts.length === 0) {
      await sendRawTelegramMessage(chatId, "✅ Nothing at or below its reorder level right now.");
      return true;
    }
    const lines = alerts.slice(0, 25).map((a) => `${a.severity === "danger" ? "🔴" : "🟡"} ${a.detail}`).join("\n");
    await sendRawTelegramMessage(
      chatId,
      `📉 <b>${escapeHtml(partner.businessName)} — Low Stock (${alerts.length})</b>\n\n${lines}${alerts.length > 25 ? `\n\n…and ${alerts.length - 25} more.` : ""}`
    );
    return true;
  }

  // /subscription — reads the Partner row itself, no module gate.
  const planName = partner.planId ? (await getPlan(partner.planId))?.name ?? partner.planId : "Trial";
  const expiry =
    partner.subscriptionStatus === "Trial" && partner.trialEndAt
      ? `Trial ends ${istTimestamp(partner.trialEndAt)}`
      : partner.subscriptionStatus;
  await sendRawTelegramMessage(
    chatId,
    `🔑 <b>${escapeHtml(partner.businessName)} — Subscription</b>\n\n<pre>\nPlan     ${planName}\nStatus   ${partner.subscriptionStatus}\n${partner.subscriptionStatus === "Trial" ? "Expiry   " + expiry : ""}\n</pre>`
  );
  return true;
}

/**
 * Receives every Telegram Bot API update once a webhook is registered
 * (setWebhook — see .env.example / src/lib/env.ts for the exact call). This
 * is the genuine external-webhook exception (same class as
 * src/app/api/razorpay/webhook/route.ts): Telegram calls this directly, not
 * a logged-in browser, so it can't go through the normal partner-session
 * gate. Its ONLY security boundary is the `secret_token` Telegram echoes
 * back as the X-Telegram-Bot-Api-Secret-Token header, checked against
 * TELEGRAM_WEBHOOK_SECRET below — Telegram does not sign webhook bodies the
 * way Razorpay signs its webhook payloads, so there's no signature to
 * verify instead.
 *
 * Handles:
 *   1. `/start <partnerId>` — the "Connect Telegram" deep-link flow
 *      (buildTelegramConnectLink in src/lib/telegram.ts). Saves the chat
 *      that sent it as that partner's TelegramSettings.chatId and replies
 *      with a confirmation.
 *   1c. `/sendreport` — manual on-demand trigger of the same report run the
 *      telegram-reports cron performs, restricted to the ops chat only
 *      (see the handler below for the full authorization rationale).
 *   1d. `/announce <text>` — broadcasts a free-text "general announcement"
 *      to every partner with a connected chat, also restricted to the ops
 *      chat only. Meant to be paired with Telegram's own native "Schedule
 *      Message" feature for one-off ad-hoc scheduled announcements.
 *   1b. Every other slash command in telegramTemplateDefs.ts — see
 *      handleTemplateCommand() below: /report_daily|weekly|monthly pull
 *      that chat's connected partner's real current digest on demand,
 *      /test_* commands preview a template with sample data, /help lists
 *      every command. Any admin-edited template body (My Biz Flow Admin,
 *      a separate app — see telegramTemplatesData.ts) is reflected
 *      immediately since these read the same DB override every send does.
 *   2. Any other message that is itself a reply
 *      (message.reply_to_message.message_id set) to a message THIS bot
 *      sent — looked up via findWorkorderByReplyMessageId() against the
 *      TelegramLogEntry rows sendWorkorderTelegramAlert() writes — is
 *      logged as an incoming chat entry on that workorder.
 * Every other update is acknowledged and ignored.
 */

type TelegramUser = { id: number; is_bot?: boolean; username?: string };
/** `title` is set for a group/supergroup chat; `first_name`/`last_name`/
 * `username` are set for a private (DM) chat — see deriveChatDisplayName(). */
type TelegramChat = { id: number; type?: string; title?: string; username?: string; first_name?: string; last_name?: string };

/** Best-effort friendly name for a connected chat, captured straight from
 * Telegram's own chat object on `/start` so the settings page can show
 * "Connected — Nagaraju" / "Connected — Support Group" instead of a raw
 * numeric chat id. Returns null when nothing nameable is present. */
function deriveChatDisplayName(chat: TelegramChat): string | null {
  if (chat.title) return chat.title;
  const fullName = [chat.first_name, chat.last_name].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  if (chat.username) return `@${chat.username}`;
  return null;
}

type TelegramMessage = {
  message_id: number;
  chat: TelegramChat;
  from?: TelegramUser;
  text?: string;
  reply_to_message?: { message_id: number };
};
type TelegramUpdate = { update_id: number; message?: TelegramMessage };

async function sendTelegramReply(chatId: number, text: string): Promise<void> {
  const botToken = env.telegramBotToken();
  if (!botToken) return; // no live bot configured in this environment — nothing to actually call
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (err) {
    console.error("[telegram/webhook] failed to send reply:", err);
  }
}

export async function POST(request: Request) {
  const expectedSecret = env.telegramWebhookSecret();
  if (!expectedSecret) {
    // No secret configured on this deployment — refuse rather than accept
    // unauthenticated updates. Matches the Razorpay webhook's "not
    // configured -> 502" posture for its own missing-secret case.
    return NextResponse.json({ error: "Telegram webhook not configured — missing TELEGRAM_WEBHOOK_SECRET" }, { status: 502 });
  }
  const receivedSecret = request.headers.get("x-telegram-bot-api-secret-token");
  if (receivedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Invalid or missing secret token" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = update.message;
  if (!message || !message.chat) {
    // Not a message update (could be an edited_message, a callback_query,
    // etc.) — nothing this route handles yet.
    return NextResponse.json({ ok: true });
  }

  const chatId = String(message.chat.id);
  const text = message.text ?? "";

  // Case 1: /start <partnerId> — the deep-link connect flow.
  const startMatch = text.match(/^\/start(?:@\S+)?(?:\s+(\S+))?/);
  if (startMatch) {
    const rawPayload = startMatch[1];
    if (!rawPayload) {
      await sendTelegramReply(message.chat.id, "Open this bot using the \"Connect Telegram\" link from your My Biz Flow Telegram Alerts page.");
      return NextResponse.json({ ok: true });
    }
    const { partnerId, slot } = parseStartPayload(rawPayload);
    const partner = await getPartner(partnerId);
    if (!partner) {
      await sendTelegramReply(message.chat.id, "This connect link isn't valid — please use the link on your Telegram Alerts page again.");
      return NextResponse.json({ ok: true });
    }

    // A slot only ever connects once from the partner's own side now — a
    // partner can no longer reconnect/change it themselves (only a Super
    // Admin can, from the Admin app), so re-scanning an old saved QR image
    // must not silently hijack an already-connected slot to a different
    // chat. An idempotent re-/start from the SAME chat is still a harmless
    // no-op/reconfirm.
    const existingSettings = await getTelegramSettings(partnerId);
    const currentChatId = slot === "group" ? existingSettings.groupChatId : existingSettings.chatId;
    if (currentChatId && currentChatId !== chatId) {
      await sendTelegramReply(
        message.chat.id,
        "This My Biz Flow account already has a Telegram chat connected for this slot. Contact support if you need it changed."
      );
      return NextResponse.json({ ok: true });
    }

    await connectTelegramChat(partnerId, chatId, slot, deriveChatDisplayName(message.chat));
    const slotLabel = slot === "group" ? "group chat" : "personal chat";
    await sendTelegramReply(message.chat.id, await connectConfirmationMessage(slotLabel));
    return NextResponse.json({ ok: true });
  }

  // Case 1a-1: /tgid — open to every chat (no ops/connect gating), since
  // this is exactly the number someone needs *before* they can set up
  // anything else (TELEGRAM_OPS_CHAT_ID, a group chat connection, etc.) —
  // gating it would make it useless for that purpose. Reports the chat's
  // own Telegram id and whether it's a group so the same reply works for
  // "what's my personal chat id" and "what's my group's chat id".
  if (text.trim().toLowerCase() === "/tgid") {
    const chatType = message.chat.type; // "private" | "group" | "supergroup" | "channel"
    const isGroup = chatType === "group" || chatType === "supergroup";
    const title = message.chat.title;
    await sendTelegramReply(
      message.chat.id,
      isGroup
        ? `This group's Telegram chat id: ${chatId}${title ? `\nGroup: ${title}` : ""}`
        : `Your personal Telegram chat id: ${chatId}`
    );
    return NextResponse.json({ ok: true });
  }

  // Case 1c: /sendreport — manual on-demand trigger for the same run the
  // 9 PM IST cron endpoint performs (src/app/api/cron/telegram-reports/
  // route.ts), added because GitHub Actions' own `schedule` trigger for
  // that cron has been observed to drop most of its daily firings. This is
  // a platform-wide action (it can send every partner's report), so it's
  // only honored from the Super Admin's own connected ops chat
  // (platform_settings.opsChatId / TELEGRAM_OPS_CHAT_ID) — never from an
  // arbitrary partner's chat. Any other chat sending this gets no reply at
  // all, same posture as an unrecognized command from Case 1b's
  // handleTemplateCommand (only /help lists real commands).
  if (text.trim().toLowerCase() === "/sendreport") {
    const adminChatIds = await getAdminChatIds();
    if (!adminChatIds.includes(chatId)) {
      return NextResponse.json({ ok: true });
    }
    try {
      const result = await runTelegramReportsNow(new Date(), "manual");
      await sendTelegramReply(
        message.chat.id,
        `Report send triggered — ${result.partnersConsidered} partner(s) considered, ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped (not due / already sent today).`
      );
    } catch (err) {
      await sendTelegramReply(
        message.chat.id,
        `Report send failed to run: ${err instanceof Error ? err.message : "unknown error"}`
      );
    }
    return NextResponse.json({ ok: true });
  }

  // Case 1c-2: /status — ops-chat-only visibility into whether the
  // Telegram report cron is actually firing, since GitHub Actions'
  // `schedule` trigger returning HTTP 200 doesn't mean a report was ever
  // sent (it's a no-op outside isWithinReportWindow). Shows the last cron-
  // triggered run and the last run overall (any trigger), per cadence,
  // all in IST — see reportDay()/isWithinReportWindow in
  // telegramReportData.ts for why a run can legitimately land after
  // midnight IST and still count as the prior business day.
  if (text.trim().toLowerCase() === "/status") {
    const adminChatIds = await getAdminChatIds();
    if (!adminChatIds.includes(chatId)) {
      return NextResponse.json({ ok: true });
    }
    const runs = await getReportRuns(100);
    const cadences = ["DAILY", "WEEKLY", "MONTHLY"];
    const lines: string[] = [];
    for (const cadence of cadences) {
      const cadenceRuns = runs.filter((r) => r.cadence === cadence);
      const lastCron = cadenceRuns.find((r) => r.trigger === "cron");
      const lastAny = cadenceRuns[0];
      if (!lastAny) {
        lines.push(`${cadence}: no run recorded yet`);
        continue;
      }
      const lastAnyWhen = istTimestamp(new Date(lastAny.createdAt));
      lines.push(
        `${cadence}: last run ${lastAnyWhen} (${lastAny.trigger}) — sent ${lastAny.sent}, failed ${lastAny.failed}, skipped ${lastAny.skipped}` +
          (lastCron ? `\n  last cron-triggered: ${istTimestamp(new Date(lastCron.createdAt))}` : `\n  last cron-triggered: never`)
      );
    }
    await sendTelegramReply(message.chat.id, `Report cron status (IST):\n\n${lines.join("\n\n")}`);
    return NextResponse.json({ ok: true });
  }

  // Case 1c-3: /syncmenu — re-pushes the Telegram-native "/" autocomplete
  // menu (PUBLIC_COMMANDS to everyone, ADMIN_COMMANDS to every current
  // admin chat from getAdminChatIds()). That popup is Telegram's own UI
  // feature (setMyCommands), entirely separate from this route's command
  // dispatch — it never updates itself when a command is added/removed
  // here or when TELEGRAM_ADMIN_CHAT_IDS changes, so this is the deliberate
  // re-sync point for that drift.
  if (text.trim().toLowerCase() === "/syncmenu") {
    const adminChatIds = await getAdminChatIds();
    if (!adminChatIds.includes(chatId)) {
      return NextResponse.json({ ok: true });
    }
    const defaultOk = await setTelegramCommands(partnerNativeCommands([]));
    let adminOk = 0;
    for (const id of adminChatIds) {
      if (await setTelegramCommands(ADMIN_COMMANDS, id)) adminOk += 1;
    }
    await sendTelegramReply(
      message.chat.id,
      `Menu sync: default list ${defaultOk ? "OK" : "FAILED"}, admin list pushed to ${adminOk}/${adminChatIds.length} admin chat(s).`
    );
    return NextResponse.json({ ok: true });
  }

  // Case 1d: /announce [owner|group|both] <text> — ad-hoc broadcast of a
  // free-text message to every partner. Composed in Telegram, this is
  // meant to be sent via Telegram's own native "Schedule Message" feature so
  // it arrives (and triggers this broadcast) at a chosen future time — a
  // one-off scheduler with no cron/DB entry needed. Same ops-chat-only
  // authorization as /sendreport above: this fans out to every partner, so
  // it must never be reachable from an arbitrary partner's own chat.
  //
  // The optional leading target word picks WHICH connected chat(s) per
  // partner get this broadcast — "owner" (personal chat only), "group"
  // (group chat only), or "both" (whichever exist). Defaults to "both" when
  // omitted, matching the original behaviour. This deliberately sends
  // straight to chatId/groupChatId rather than going through
  // sendPartnerTelegramAlert's routing["generalAnnouncement"] opt-out: an
  // explicit admin-chosen target for a one-off broadcast should reach that
  // chat regardless of a partner's standing announcement preference.
  //
  // Note: telegramTemplateDefs.ts already registers "/announce" as the
  // /test_* preview command for the "general_announcement" template (see
  // handleTemplateCommand's generic fallback branch) — that preview only
  // ever replies to the sender with sample data. This case is checked FIRST
  // so a real "/announce ..." from the ops chat performs the actual
  // broadcast instead of falling into that preview path.
  if (/^\/announce(?:@\S+)?(\s|$)/i.test(text)) {
    const adminChatIds = await getAdminChatIds();
    if (!adminChatIds.includes(chatId)) {
      return NextResponse.json({ ok: true });
    }
    const spaceIdx = text.indexOf(" ");
    let rest = spaceIdx === -1 ? "" : text.slice(spaceIdx + 1);

    type AnnounceTarget = "owner" | "group" | "both";
    let target: AnnounceTarget = "both";
    const targetMatch = rest.match(/^(owner|group|both)(\s+|$)/i);
    if (targetMatch) {
      target = targetMatch[1].toLowerCase() as AnnounceTarget;
      rest = rest.slice(targetMatch[0].length);
    }

    const announcementText = rest.trim();
    if (!announcementText) {
      await sendTelegramReply(message.chat.id, "Usage: /announce [owner|group|both] <your message> — target defaults to both if omitted.");
      return NextResponse.json({ ok: true });
    }

    const partners = await listPartnersWithReportsEnabled(); // every partner with at least one connected chat (personal or group) — see that function's own doc comment
    const rendered = await generalAnnouncementMessage(escapeHtml(announcementText));
    let sentCount = 0;
    let skippedCount = 0;
    for (const partner of partners) {
      const targets: string[] = [];
      if ((target === "owner" || target === "both") && partner.chatId) targets.push(partner.chatId);
      if ((target === "group" || target === "both") && partner.groupChatId) targets.push(partner.groupChatId);
      if (targets.length === 0) {
        skippedCount += 1;
        continue;
      }
      for (const targetChatId of targets) {
        const messageId = await sendRawTelegramMessage(targetChatId, rendered);
        if (messageId !== null) sentCount += 1;
      }
    }

    await sendTelegramReply(
      message.chat.id,
      partners.length === 0
        ? "0 partners have a connected chat — nothing was sent."
        : `Announcement (target: ${target}) sent to ${sentCount} chat(s) across ${partners.length} partner(s)${skippedCount > 0 ? `, ${skippedCount} partner(s) had no matching chat for this target` : ""}.`
    );
    return NextResponse.json({ ok: true });
  }

  // Case 1a-2: /help from the ops chat specifically also lists the
  // platform-wide admin commands (Case 1c/1c-2/1d below) ahead of the
  // regular per-partner command list from handleTemplateCommand, since
  // those admin commands aren't in TELEGRAM_TEMPLATE_DEFS at all.
  if (text.trim().toLowerCase() === "/help") {
    const adminChatIds = await getAdminChatIds();
    if (adminChatIds.includes(chatId)) {
      await sendRawTelegramMessage(
        chatId,
        "Admin commands (this chat only):\n" +
          "/status — cron health for the Telegram report runs (last send per cadence, in IST)\n" +
          "/sendreport — trigger today's due reports right now (same send/skip rules as the cron)\n" +
          "/announce [owner|group|both] <text> — broadcast to every partner's chosen chat (defaults to both)\n" +
          "/syncmenu — re-sync the \"/\" command menu for everyone and every admin chat\n" +
          "/resolve — reply this to a support-ticket thread message to mark that ticket resolved\n" +
          "/tgid — this chat's Telegram id (also works for any partner/group chat, not admin-only)",
        undefined,
        [["/status", "/sendreport"], ["/help", "/tgid"]]
      );
    }
  }

  // Case 1b-2: /workorders, /inquiries, /tat, /invoices, /lowstock,
  // /subscription — on-demand live data pulls, see handleLiveDataCommand's
  // own doc comment. Checked before Case 1b so these never fall through to
  // handleTemplateCommand's "unrecognized command" no-op.
  if (text.startsWith("/") && (await handleLiveDataCommand(chatId, text, message.message_id))) {
    return NextResponse.json({ ok: true });
  }

  // Case 1b: any other slash command from telegramTemplateDefs.ts — see
  // handleTemplateCommand's own doc comment (/report_*, /test_*, /help).
  if (text.startsWith("/") && (await handleTemplateCommand(chatId, text))) {
    return NextResponse.json({ ok: true });
  }

  // Case 2: a reply to a message this bot sent — match it back to the
  // workorder that alert was about, and log it as a chat entry there.
  const repliedToMessageId = message.reply_to_message?.message_id;
  if (typeof repliedToMessageId === "number") {
    const workorderMatch = await findWorkorderByReplyMessageId(chatId, repliedToMessageId);
    if (workorderMatch && text) {
      const connectedId = await findPartnerIdByChatId(chatId);
      if (connectedId !== workorderMatch.partnerId || !(await getVisibleModuleSlugs(connectedId)).includes("service-centre")) {
        return NextResponse.json({ ok: true });
      }
      await assertPartnerCanWrite(workorderMatch.partnerId);
      await appendTelegramChatLogEntry(workorderMatch.partnerId, workorderMatch.workorderId, {
        direction: "in",
        text,
        chatId,
        // Telegram retries webhook deliveries it didn't get a timely 200
        // for — same update_id/message_id resent. appendTelegramChatLogEntry
        // uses this to skip a duplicate log entry on a retried delivery.
        messageId: message.message_id,
      });
      return NextResponse.json({ ok: true });
    }

    // Case 2b: a reply within a live support-chat thread — from a human on
    // the team, or a bot script hitting the Bot API — appended to that
    // ticket, which the partner's widget is polling for. See
    // src/lib/supportTickets.ts's own doc comment for the full mechanism.
    const ticketMatch = await findSupportTicketByReplyMessageId(chatId, repliedToMessageId);
    if (ticketMatch && text) {
      // Historical message links survive removal from the admin chat list.
      // Authorization must be checked at the time of every reply or resolution.
      if (!(await getAdminChatIds()).includes(chatId)) return NextResponse.json({ ok: true });
      // /resolve as a reply to the ticket's own thread, instead of a
      // separate "/resolve <ticketId>" command — reuses the exact same
      // thread-matching this case already does, so there's no separate
      // ticketId lookup to get wrong. Current admin membership was checked above.
      if (text.trim().toLowerCase() === "/resolve") {
        await setSupportTicketStatus(ticketMatch.partnerId, ticketMatch.ticketId, "resolved");
        await sendTelegramReply(message.chat.id, `Ticket ${ticketMatch.ticketId} marked resolved.`);
        return NextResponse.json({ ok: true });
      }
      await appendSupportReply(ticketMatch.partnerId, ticketMatch.ticketId, text, { chatId, messageId: message.message_id });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  }

  // Anything else (a plain unprompted message, a sticker, etc.) — nothing
  // to route it to; acknowledge and drop it.
  return NextResponse.json({ ok: true });
}
