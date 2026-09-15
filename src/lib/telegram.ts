/**
 * Per-partner Telegram alert settings + sender — mirrors src/lib/sms.ts's
 * graceful-degradation posture exactly: with no TELEGRAM_BOT_TOKEN set,
 * sendPartnerTelegramAlert() no-ops (but still records a real log entry)
 * instead of throwing. The settings themselves (chatId, report frequency,
 * which alert types are enabled) are real and persisted in
 * TelegramSettings — only the actual bot delivery needs a real token this
 * repo doesn't have.
 *
 * Adapted from AN-CRM's real Telegram system (src/core/telegram/
 * vendorMessageTypes.ts's occasion catalog, src/models/TelegramLog.ts's
 * send-history audit log, and VendorProfile.telegramReportFrequency's
 * digest cadence setting) — matched here without a live bot connection.
 */
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { getBusinessRecord, updateBusinessRecord } from "@/lib/businessRecords";

export const TELEGRAM_ALERT_TYPES = [
  { key: "newWorkorder", label: "New workorder assigned" },
  { key: "workorderClosed", label: "Workorder closed" },
  { key: "workorderCancelled", label: "Workorder cancelled" },
  { key: "paymentReceived", label: "Payment received" },
  { key: "paymentDue", label: "Payment due" },
  { key: "lowStock", label: "Low stock alert" },
  { key: "subscriptionExpiring", label: "Subscription expiring" },
  { key: "generalAnnouncement", label: "General announcement" },
] as const;

export type TelegramAlertType = (typeof TELEGRAM_ALERT_TYPES)[number]["key"];

/** Digest cadence for the automatic business-summary report — matches AN-CRM's
 * VendorProfile.telegramReportFrequency (DAILY/WEEKLY/MONTHLY, plus NONE/off). */
export const TELEGRAM_REPORT_FREQUENCIES = ["NONE", "DAILY", "WEEKLY", "MONTHLY"] as const;
export type TelegramReportFrequency = (typeof TELEGRAM_REPORT_FREQUENCIES)[number];

/** Which connected chat an alert type is routed to. A type with no explicit
 * entry in `routing` defaults to "both" — send to whichever of
 * chatId/groupChatId is actually connected (so a partner with only one chat
 * connected keeps getting alerts there, unchanged from before routing existed). */
export type TelegramChatSlot = "personal" | "group";
export type AlertDestination = TelegramChatSlot | "both";
export type TelegramRoutingMap = Partial<Record<TelegramAlertType, AlertDestination>>;

export type TelegramSettingsRecord = {
  partnerId: string;
  chatId: string | null;
  groupChatId: string | null;
  enabledTypes: TelegramAlertType[];
  routing: TelegramRoutingMap;
  reportFrequency: TelegramReportFrequency;
};

export type TelegramLogEntryRecord = {
  id: string;
  type: string;
  message: string;
  chatId: string | null;
  sent: boolean;
  reason: string | null;
  createdAt: string;
};

export async function getTelegramSettings(partnerId: string): Promise<TelegramSettingsRecord> {
  const row = await prisma.telegramSettings.findUnique({ where: { partnerId } });
  return {
    partnerId,
    chatId: row?.chatId ?? null,
    groupChatId: row?.groupChatId ?? null,
    enabledTypes: (row?.enabledTypes as TelegramAlertType[] | undefined) ?? [],
    routing: (row?.routing as TelegramRoutingMap | undefined) ?? {},
    reportFrequency: (row?.reportFrequency as TelegramReportFrequency | undefined) ?? "NONE",
  };
}

export async function saveTelegramSettings(
  partnerId: string,
  chatId: string,
  enabledTypes: TelegramAlertType[],
  reportFrequency: TelegramReportFrequency,
  extra?: { groupChatId?: string; routing?: TelegramRoutingMap }
): Promise<void> {
  const existing = await getTelegramSettings(partnerId);
  const groupChatId = extra?.groupChatId !== undefined ? extra.groupChatId : existing.groupChatId ?? "";
  const routing = extra?.routing !== undefined ? extra.routing : existing.routing;
  await prisma.telegramSettings.upsert({
    where: { partnerId },
    create: { partnerId, chatId: chatId || null, groupChatId: groupChatId || null, enabledTypes, routing, reportFrequency },
    update: { chatId: chatId || null, groupChatId: groupChatId || null, enabledTypes, routing, reportFrequency },
  });
}

/** Saves only the routing map, leaving chat ids / enabled types / report
 * frequency untouched — the action behind the per-alert-type routing select
 * on the Telegram Alerts page. */
export async function saveTelegramRouting(partnerId: string, routing: TelegramRoutingMap): Promise<void> {
  const existing = await getTelegramSettings(partnerId);
  await saveTelegramSettings(partnerId, existing.chatId ?? "", existing.enabledTypes, existing.reportFrequency, {
    groupChatId: existing.groupChatId ?? "",
    routing,
  });
}

/** Resolves which chat id(s) a given alert (or "test") should be sent to,
 * honouring the routing map — a type with no explicit entry defaults to
 * "both" so a partner with only one chat connected keeps getting alerts
 * there exactly as before routing existed. "test" always goes to every
 * connected chat, ignoring routing, so the Send Test Message button
 * verifies both slots at once. */
function resolveChatIdsForType(settings: TelegramSettingsRecord, type: TelegramAlertType | "test"): string[] {
  if (type === "test") {
    return [settings.chatId, settings.groupChatId].filter((id): id is string => Boolean(id));
  }
  const destination = settings.routing[type] ?? "both";
  const ids: string[] = [];
  if ((destination === "personal" || destination === "both") && settings.chatId) ids.push(settings.chatId);
  if ((destination === "group" || destination === "both") && settings.groupChatId) ids.push(settings.groupChatId);
  return ids;
}

/** Recent send-attempt history for a partner — real even with no bot token,
 * so the settings page can show what would have gone out. Mirrors AN-CRM's
 * TelegramLog listing (console/admin/telegram-notifications-log). */
export async function getTelegramLog(partnerId: string, limit = 20): Promise<TelegramLogEntryRecord[]> {
  const rows = await prisma.telegramLogEntry.findMany({
    where: { partnerId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    message: r.message,
    chatId: r.chatId,
    sent: r.sent,
    reason: r.reason,
    createdAt: r.createdAt.toISOString(),
  }));
}

async function recordTelegramLog(input: {
  partnerId: string;
  type: string;
  message: string;
  chatId: string | null;
  sent: boolean;
  reason: string | null;
  messageId?: number | null;
  workorderId?: string | null;
}): Promise<void> {
  try {
    await prisma.telegramLogEntry.create({
      data: {
        id: `tglog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        ...input,
      },
    });
  } catch (err) {
    // Never let logging itself break a send attempt.
    console.error("[telegram] failed to record log entry:", err);
  }
}

/**
 * Sends one alert to a partner's configured chat, IF they've enabled that
 * alert type and set a chatId. Every attempt — sent or not — is recorded
 * to TelegramLogEntry so the settings page has a real activity history.
 * Never throws — this is best-effort, matching sendSms()'s posture.
 *
 * When `workorderId` is given, the sent message's own Bot API message_id is
 * captured onto the log row alongside it — that's the reply-threading key
 * findWorkorderByReplyMessageId() below reads from, so a later reply in the
 * partner's Telegram chat can be matched back to this exact workorder. Most
 * callers should go through the plain sendPartnerTelegramAlert() below;
 * sendWorkorderTelegramAlert() is the one that actually passes a
 * workorderId.
 */
async function sendTelegramAlertInternal(
  partnerId: string,
  type: TelegramAlertType | "test",
  message: string,
  workorderId: string | null
): Promise<void> {
  const settings = await getTelegramSettings(partnerId);
  const chatIds = resolveChatIdsForType(settings, type);

  if (chatIds.length === 0) {
    await recordTelegramLog({ partnerId, type, message, chatId: null, sent: false, reason: "no chat id configured", workorderId });
    return;
  }
  if (type !== "test" && !settings.enabledTypes.includes(type)) {
    await recordTelegramLog({ partnerId, type, message, chatId: chatIds[0], sent: false, reason: "alert type disabled", workorderId });
    return;
  }

  const botToken = env.telegramBotToken();
  if (!botToken) {
    for (const chatId of chatIds) {
      console.log(`[telegram:not-configured] would send to partner ${partnerId} chat ${chatId}: ${message}`);
      await recordTelegramLog({
        partnerId, type, message, chatId, sent: false,
        reason: "not configured — no TELEGRAM_BOT_TOKEN", workorderId,
      });
    }
    return;
  }

  // Routing can resolve to more than one chat (a "both" alert type with
  // personal and group both connected) — send and log each independently so
  // a failure delivering to one chat doesn't affect the other, and so
  // reply-threading (findWorkorderByReplyMessageId) still resolves per-chat.
  for (const chatId of chatIds) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "Markdown" }),
      });
      // Telegram's sendMessage response carries the sent message's own
      // message_id (result.message_id) — this is what a reply's
      // reply_to_message.message_id will echo back, so it's the only real
      // key for mapping a future reply to `workorderId`.
      let sentMessageId: number | null = null;
      try {
        const body = (await res.json()) as { ok?: boolean; result?: { message_id?: number } };
        if (body.ok && typeof body.result?.message_id === "number") {
          sentMessageId = body.result.message_id;
        }
      } catch {
        // Response body wasn't valid JSON — still record the send attempt below.
      }
      await recordTelegramLog({
        partnerId, type, message, chatId, sent: true, reason: null,
        messageId: sentMessageId, workorderId,
      });
    } catch (err) {
      console.error("[telegram] send failed:", err);
      await recordTelegramLog({ partnerId, type, message, chatId, sent: false, reason: "send failed", workorderId });
    }
  }
}

/** Generic alert send — not tied to a specific workorder. Kept for occasions
 * that don't (yet) need reply-threading: paymentReceived, paymentDue,
 * lowStock, subscriptionExpiring, generalAnnouncement, and the test button. */
export async function sendPartnerTelegramAlert(
  partnerId: string,
  type: TelegramAlertType | "test",
  message: string
): Promise<void> {
  await sendTelegramAlertInternal(partnerId, type, message, null);
}

/**
 * Workorder-aware alert send — identical delivery/logging to
 * sendPartnerTelegramAlert(), except the sent message's own message_id is
 * captured and tied to `workorderId` on the TelegramLogEntry row, so a
 * partner replying to this exact message in Telegram can be matched back to
 * this workorder (see findWorkorderByReplyMessageId() + the webhook route).
 * Currently wired only for the "new workorder" alert on workorder creation —
 * see createServiceCentreWorkorderAction.
 */
export async function sendWorkorderTelegramAlert(
  partnerId: string,
  workorderId: string,
  type: TelegramAlertType,
  message: string
): Promise<void> {
  await sendTelegramAlertInternal(partnerId, type, message, workorderId);
}

/**
 * Reply-threading lookup: given the chat a reply came in on and the
 * message_id it was a reply TO (Telegram's
 * update.message.reply_to_message.message_id), finds which
 * (partnerId, workorderId) that original message was sent for. Returns null
 * when no matching outbound alert is on record (e.g. the reply is to some
 * other message, or threading was never enabled for that occasion).
 */
export async function findWorkorderByReplyMessageId(
  chatId: string,
  messageId: number
): Promise<{ partnerId: string; workorderId: string } | null> {
  const row = await prisma.telegramLogEntry.findFirst({
    where: { chatId, messageId, sent: true, workorderId: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (!row || !row.workorderId) return null;
  return { partnerId: row.partnerId, workorderId: row.workorderId };
}

/** One entry in a workorder's Telegram chat log — see appendTelegramChatLogEntry(). */
export type TelegramChatLogEntry = {
  at: string;
  direction: "in" | "out";
  text: string;
  chatId: string;
  /** The inbound Telegram message_id this entry was logged from — see
   *  appendTelegramChatLogEntry()'s idempotency check below. Optional only
   *  because entries logged before this field existed don't have it. */
  messageId?: number;
};

/**
 * Appends one entry to a workorder's `telegramChatLog` array field
 * (service-centre BusinessRecord) — real-modify-write against the JSON
 * blob, same pattern createInvoiceFromWorkorderAction/deductInventoryForWorkorderAction
 * already use. Called by the webhook route when an incoming reply is
 * matched to a workorder, so it shows up in that workorder's own activity
 * feed (getServiceCentreTimeline in sample-data/service-centre.ts).
 */
export async function appendTelegramChatLogEntry(
  partnerId: string,
  workorderId: string,
  entry: Omit<TelegramChatLogEntry, "at">
): Promise<void> {
  const record = await getBusinessRecord(partnerId, "service-centre", workorderId);
  if (!record) {
    console.error(`[telegram] cannot log chat reply — workorder "${workorderId}" not found for partner "${partnerId}"`);
    return;
  }
  const existing = (record["telegramChatLog"] as TelegramChatLogEntry[] | undefined) ?? [];
  // Telegram guarantees at-least-once webhook delivery — a slow response
  // (or a timeout that still completed server-side) makes Telegram resend
  // the exact same update. Without this check, a retried reply would be
  // appended to telegramChatLog a second time as a duplicate "in" entry.
  // messageId is the inbound message's own id, which is stable across
  // retries of the same update, so it doubles as the idempotency key.
  if (entry.messageId !== undefined && existing.some((e) => e.messageId === entry.messageId)) {
    return;
  }
  const next: TelegramChatLogEntry[] = [...existing, { ...entry, at: new Date().toISOString() }];
  await updateBusinessRecord(partnerId, "service-centre", workorderId, { ...record, telegramChatLog: next });
}

/** Suffix appended to the deep-link `/start` payload to say which chat slot
 * (personal DM vs. group) the connecting chat should be captured into — see
 * buildTelegramConnectLink() / the webhook route's parseStartPayload(). Kept
 * as a plain suffix (not e.g. a colon) because Telegram's start_param must
 * match `[A-Za-z0-9_-]+`. */
const START_PAYLOAD_SLOT_SUFFIX: Record<TelegramChatSlot, string> = {
  personal: "_slot_personal",
  group: "_slot_group",
};

/**
 * The "Connect Telegram" deep link shown on the Telegram Alerts page, one
 * per chat slot — https://t.me/<bot_username>?start=<partnerId>_slot_<slot>.
 * Opening it in Telegram and hitting Start sends that payload as
 * `/start <payload>` to the bot, which the webhook route
 * (src/app/api/telegram/webhook/route.ts) decodes via parseStartPayload()
 * and hands to connectTelegramChat() below. Returns null when
 * TELEGRAM_BOT_USERNAME isn't configured yet, so the page can show a
 * "not set up" state instead of a dead link.
 */
export function buildTelegramConnectLink(partnerId: string, slot: TelegramChatSlot = "personal"): string | null {
  const username = env.telegramBotUsername();
  if (!username) return null;
  const payload = `${partnerId}${START_PAYLOAD_SLOT_SUFFIX[slot]}`;
  return `https://t.me/${username}?start=${encodeURIComponent(payload)}`;
}

/**
 * Decodes a `/start` payload built by buildTelegramConnectLink() back into
 * (partnerId, slot). Falls back to slot "personal" for a payload with no
 * recognized suffix, so links generated before slots existed still connect
 * as a personal chat instead of failing outright.
 */
export function parseStartPayload(payload: string): { partnerId: string; slot: TelegramChatSlot } {
  for (const [slot, suffix] of Object.entries(START_PAYLOAD_SLOT_SUFFIX) as [TelegramChatSlot, string][]) {
    if (payload.endsWith(suffix)) {
      return { partnerId: payload.slice(0, -suffix.length), slot };
    }
  }
  return { partnerId: payload, slot: "personal" };
}

/**
 * Called by the webhook route on a `/start <payload>` command — saves the
 * chat that sent it as this partner's TelegramSettings.chatId (personal) or
 * groupChatId (group), replacing the old single-chat manual-entry flow with
 * an automatic per-slot capture. Preserves whatever enabledTypes/routing/
 * reportFrequency/other chat slot the partner already had configured (or
 * the defaults, for a brand-new connection).
 */
export async function connectTelegramChat(partnerId: string, chatId: string, slot: TelegramChatSlot = "personal"): Promise<void> {
  const existing = await getTelegramSettings(partnerId);
  if (slot === "group") {
    await saveTelegramSettings(partnerId, existing.chatId ?? "", existing.enabledTypes, existing.reportFrequency, {
      groupChatId: chatId,
      routing: existing.routing,
    });
  } else {
    await saveTelegramSettings(partnerId, chatId, existing.enabledTypes, existing.reportFrequency, {
      groupChatId: existing.groupChatId ?? "",
      routing: existing.routing,
    });
  }
}

/** Clears one of a partner's connected chats — the "Disconnect" affordance
 * on the Telegram Alerts page, now per-slot since personal and group
 * connect/disconnect independently. */
export async function disconnectTelegramChat(partnerId: string, slot: TelegramChatSlot = "personal"): Promise<void> {
  const existing = await getTelegramSettings(partnerId);
  if (slot === "group") {
    await saveTelegramSettings(partnerId, existing.chatId ?? "", existing.enabledTypes, existing.reportFrequency, {
      groupChatId: "",
      routing: existing.routing,
    });
  } else {
    await saveTelegramSettings(partnerId, "", existing.enabledTypes, existing.reportFrequency, {
      groupChatId: existing.groupChatId ?? "",
      routing: existing.routing,
    });
  }
}
