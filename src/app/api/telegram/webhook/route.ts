import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getPartner } from "@/lib/partnerData";
import { connectTelegramChat, findWorkorderByReplyMessageId, appendTelegramChatLogEntry, parseStartPayload } from "@/lib/telegram";

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
 * Handles exactly two cases, both described in the task:
 *   1. `/start <partnerId>` — the "Connect Telegram" deep-link flow
 *      (buildTelegramConnectLink in src/lib/telegram.ts). Saves the chat
 *      that sent it as that partner's TelegramSettings.chatId and replies
 *      with a confirmation.
 *   2. Any other message that is itself a reply
 *      (message.reply_to_message.message_id set) to a message THIS bot
 *      sent — looked up via findWorkorderByReplyMessageId() against the
 *      TelegramLogEntry rows sendWorkorderTelegramAlert() writes — is
 *      logged as an incoming chat entry on that workorder.
 * Every other update is acknowledged and ignored.
 */

type TelegramUser = { id: number; is_bot?: boolean; username?: string };
type TelegramChat = { id: number };
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
    await connectTelegramChat(partnerId, chatId, slot);
    const slotLabel = slot === "group" ? "group chat" : "personal chat";
    await sendTelegramReply(message.chat.id, `✅ Connected — My Biz Flow alerts for ${partner.businessName} will come here (${slotLabel}).`);
    return NextResponse.json({ ok: true });
  }

  // Case 2: a reply to a message this bot sent — match it back to the
  // workorder that alert was about, and log it as a chat entry there.
  const repliedToMessageId = message.reply_to_message?.message_id;
  if (typeof repliedToMessageId === "number") {
    const match = await findWorkorderByReplyMessageId(chatId, repliedToMessageId);
    if (match && text) {
      await appendTelegramChatLogEntry(match.partnerId, match.workorderId, {
        direction: "in",
        text,
        chatId,
        // Telegram retries webhook deliveries it didn't get a timely 200
        // for — same update_id/message_id resent. appendTelegramChatLogEntry
        // uses this to skip a duplicate log entry on a retried delivery.
        messageId: message.message_id,
      });
    }
    return NextResponse.json({ ok: true });
  }

  // Anything else (a plain unprompted message, a sticker, etc.) — nothing
  // to route it to; acknowledge and drop it.
  return NextResponse.json({ ok: true });
}
