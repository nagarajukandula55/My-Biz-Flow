import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getPartner } from "@/lib/partnerData";
import {
  connectTelegramChat,
  findWorkorderByReplyMessageId,
  appendTelegramChatLogEntry,
  parseStartPayload,
  findPartnerIdByChatId,
  sendRawTelegramMessage,
  getTelegramSettings,
} from "@/lib/telegram";
import { findTelegramTemplateDefByCommand, TELEGRAM_TEMPLATE_DEFS } from "@/lib/telegramTemplateDefs";
import { getTelegramTemplateBody, renderTelegramTemplate } from "@/lib/telegramTemplatesData";
import { businessReportMessage, helpMessageText, connectConfirmationMessage, type ReportFrequency } from "@/lib/telegramTemplates";
import { computePartnerReportComparison } from "@/lib/telegramReportData";
import { findSupportTicketByReplyMessageId, appendSupportReply } from "@/lib/supportTickets";

function formatInr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
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
async function handleTemplateCommand(chatId: string, text: string): Promise<boolean> {
  const head = text.trim().split(/\s/)[0];
  if (!head.startsWith("/")) return false;

  if (head.toLowerCase() === "/help") {
    const commandList = TELEGRAM_TEMPLATE_DEFS.filter((d) => d.command !== "/start")
      .map((d) => `${d.command} — ${d.label}`)
      .join("\n");
    await sendRawTelegramMessage(chatId, await helpMessageText(commandList));
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
      await appendSupportReply(ticketMatch.partnerId, ticketMatch.ticketId, text, { chatId, messageId: message.message_id });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  }

  // Anything else (a plain unprompted message, a sticker, etc.) — nothing
  // to route it to; acknowledge and drop it.
  return NextResponse.json({ ok: true });
}
