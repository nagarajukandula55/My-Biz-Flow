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
  { key: "inquiryAssigned", label: "Inquiry assigned" },
  { key: "workorderClosed", label: "Workorder closed" },
  { key: "workorderCancelled", label: "Workorder cancelled" },
  { key: "paymentReceived", label: "Payment received" },
  { key: "paymentDue", label: "Payment due" },
  { key: "lowStock", label: "Low stock alert" },
  { key: "pnaLogged", label: "Part Not Available logged" },
  { key: "subscriptionExpiring", label: "Subscription expiring" },
  { key: "generalAnnouncement", label: "General announcement" },
] as const;

export type TelegramAlertType = (typeof TELEGRAM_ALERT_TYPES)[number]["key"];

/** Cadence keys the automatic business-summary report is sent on — every
 * partner with a connected chat gets all three (see routing["report"] for
 * the on/off/where control; there is no more single pick-one frequency). */
export const TELEGRAM_REPORT_CADENCES = ["DAILY", "WEEKLY", "MONTHLY"] as const;
export type TelegramReportCadence = (typeof TELEGRAM_REPORT_CADENCES)[number];

/** Which connected chat an alert type (or the "report" digest) is routed to.
 * A type with no explicit entry in `routing` defaults to "both" — send to
 * whichever of chatId/groupChatId is actually connected (so a partner with
 * only one chat connected keeps getting alerts there, unchanged from before
 * routing existed). "none" replaces the old separate enable/disable
 * checkbox — every alert type is always "on", routing is the only
 * on/off/where control. */
export type TelegramChatSlot = "personal" | "group";
export type AlertDestination = TelegramChatSlot | "both" | "none";
export type TelegramRoutingKey = TelegramAlertType | "report";
export type TelegramRoutingMap = Partial<Record<TelegramRoutingKey, AlertDestination>>;

export type TelegramSettingsRecord = {
  partnerId: string;
  chatId: string | null;
  /** Friendly display name for `chatId`, captured at connect time — see
   * TelegramSettings.chatTitle in prisma/schema.prisma. */
  chatTitle: string | null;
  groupChatId: string | null;
  groupChatTitle: string | null;
  routing: TelegramRoutingMap;
  /** Last time each report cadence was sent (or attempted) — per-cadence
   * because DAILY/WEEKLY/MONTHLY now fire independently for every connected
   * partner (e.g. every Saturday DAILY and WEEKLY are both due), so a single
   * timestamp can no longer gate all three. */
  lastReportSentAt: Partial<Record<TelegramReportCadence, Date | null>>;
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

function parseLastReportSentAt(raw: unknown): Partial<Record<TelegramReportCadence, Date | null>> {
  if (!raw || typeof raw !== "object") return {};
  const out: Partial<Record<TelegramReportCadence, Date | null>> = {};
  for (const cadence of TELEGRAM_REPORT_CADENCES) {
    const value = (raw as Record<string, unknown>)[cadence];
    if (typeof value === "string" && value) out[cadence] = new Date(value);
  }
  return out;
}

export async function getTelegramSettings(partnerId: string): Promise<TelegramSettingsRecord> {
  const row = await prisma.telegramSettings.findUnique({ where: { partnerId } });
  return {
    partnerId,
    chatId: row?.chatId ?? null,
    chatTitle: row?.chatTitle ?? null,
    groupChatId: row?.groupChatId ?? null,
    groupChatTitle: row?.groupChatTitle ?? null,
    routing: (row?.routing as TelegramRoutingMap | undefined) ?? {},
    lastReportSentAt: parseLastReportSentAt(row?.lastReportSentAt),
  };
}

/** Every partner with at least one connected chat (personal or group) — the
 * cron's iteration set. Reports are no longer per-partner opt-in/frequency —
 * every connected partner gets all three cadences, gated only by
 * routing["report"] (same as any other alert type; "none" opts out). */
export async function listPartnersWithReportsEnabled(): Promise<TelegramSettingsRecord[]> {
  const rows = await prisma.telegramSettings.findMany({
    where: { OR: [{ chatId: { not: null } }, { groupChatId: { not: null } }] },
  });
  return rows.map((row) => ({
    partnerId: row.partnerId,
    chatId: row.chatId,
    chatTitle: row.chatTitle ?? null,
    groupChatId: row.groupChatId,
    groupChatTitle: row.groupChatTitle ?? null,
    routing: (row.routing as TelegramRoutingMap | undefined) ?? {},
    lastReportSentAt: parseLastReportSentAt(row.lastReportSentAt),
  }));
}

export async function saveTelegramSettings(
  partnerId: string,
  chatId: string,
  extra?: {
    groupChatId?: string;
    routing?: TelegramRoutingMap;
    /** Undefined = leave whatever title is currently stored untouched
     * (unless `chatId` itself is changing — see below); null/"" = clear it;
     * a string = set it. */
    chatTitle?: string | null;
    groupChatTitle?: string | null;
  }
): Promise<void> {
  const existing = await getTelegramSettings(partnerId);
  const groupChatId = extra?.groupChatId !== undefined ? extra.groupChatId : existing.groupChatId ?? "";
  const routing = extra?.routing !== undefined ? extra.routing : existing.routing;
  // A title is only ever meaningful for the exact chat it was captured for —
  // if the chat id itself is changing (a manual edit, a fresh connect, or a
  // disconnect clearing it to "") and no explicit title was passed for that
  // change, drop the stale title rather than let it stick to a different chat.
  const chatTitle = extra?.chatTitle !== undefined
    ? extra.chatTitle
    : chatId !== (existing.chatId ?? "") ? null : existing.chatTitle;
  const groupChatTitle = extra?.groupChatTitle !== undefined
    ? extra.groupChatTitle
    : groupChatId !== (existing.groupChatId ?? "") ? null : existing.groupChatTitle;
  await prisma.telegramSettings.upsert({
    where: { partnerId },
    create: {
      partnerId, chatId: chatId || null, groupChatId: groupChatId || null, routing,
      chatTitle: chatTitle || null, groupChatTitle: groupChatTitle || null,
    },
    update: {
      chatId: chatId || null, groupChatId: groupChatId || null, routing,
      chatTitle: chatTitle || null, groupChatTitle: groupChatTitle || null,
    },
  });
}

/** Saves only the routing map, leaving chat ids untouched — the action
 * behind the per-alert-type routing select on the Telegram Alerts page. */
export async function saveTelegramRouting(partnerId: string, routing: TelegramRoutingMap): Promise<void> {
  const existing = await getTelegramSettings(partnerId);
  await saveTelegramSettings(partnerId, existing.chatId ?? "", {
    groupChatId: existing.groupChatId ?? "",
    routing,
  });
}

/** Resolves which chat id(s) a given alert (or "test"/"report") should be
 * sent to, honouring the routing map — a type with no explicit entry
 * defaults to "both" so a partner with only one chat connected keeps
 * getting alerts there exactly as before routing existed; "none" sends
 * nowhere. "test" always goes to every connected chat, ignoring routing, so
 * the Send Test Message button verifies both slots at once. */
function resolveChatIdsForType(settings: TelegramSettingsRecord, type: TelegramRoutingKey | "test"): string[] {
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
 * Sends one alert to a partner's configured chat(s), gated purely on the
 * resolved routing (an empty chat list — no chat connected, or routing set
 * to "none" — means no send). Every alert type is always "on"; there's no
 * more separate enable/disable check. Every attempt — sent or not — is
 * recorded to TelegramLogEntry so the settings page has a real activity
 * history. Never throws — this is best-effort, matching sendSms()'s posture.
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
  type: TelegramRoutingKey | "test",
  message: string,
  workorderId: string | null
): Promise<void> {
  const settings = await getTelegramSettings(partnerId);
  const chatIds = resolveChatIdsForType(settings, type);

  if (chatIds.length === 0) {
    await recordTelegramLog({ partnerId, type, message, chatId: null, sent: false, reason: "no chat id configured", workorderId });
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
        // "HTML" (not "Markdown") -- every message template in
        // telegramTemplates.ts uses Telegram's HTML subset (<b>, <pre>), so
        // Markdown parse_mode would render those tags as literal text.
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
      });
      // Telegram's sendMessage response carries the sent message's own
      // message_id (result.message_id) — this is what a reply's
      // reply_to_message.message_id will echo back, so it's the only real
      // key for mapping a future reply to `workorderId`. Previously this
      // block unconditionally recorded sent: true regardless of what the Bot
      // API actually returned, so a real delivery failure (bot blocked, chat
      // deleted, etc. — Telegram returns `ok: false` + a `description`) was
      // silently logged as a success. Fixed to reflect `body.ok` and capture
      // `description` as the reason, which getRecentTelegramConnectionIssue()
      // below relies on to surface an actionable "reconnect Telegram" notice.
      let body: { ok?: boolean; result?: { message_id?: number }; description?: string } | null = null;
      try {
        body = await res.json();
      } catch {
        // Response body wasn't valid JSON — fall through to the failure branch below.
      }
      if (body?.ok) {
        const sentMessageId = typeof body.result?.message_id === "number" ? body.result.message_id : null;
        await recordTelegramLog({
          partnerId, type, message, chatId, sent: true, reason: null,
          messageId: sentMessageId, workorderId,
        });
      } else {
        const reason = body?.description || `Telegram API error (status ${res.status})`;
        await recordTelegramLog({ partnerId, type, message, chatId, sent: false, reason, workorderId });
      }
    } catch (err) {
      console.error("[telegram] send failed:", err);
      await recordTelegramLog({ partnerId, type, message, chatId, sent: false, reason: "send failed", workorderId });
    }
  }
}

/** Reasons recordTelegramLog can carry that reflect a partner-fixable
 * connection problem (the chat rejected/blocked the bot, was deleted, etc.)
 * rather than a deployment-level or routing configuration state — those
 * ("no chat id configured", the missing-bot-token message) aren't things a
 * partner can act on by reconnecting Telegram. */
function isConnectionFailureReason(reason: string | null): boolean {
  if (!reason) return false;
  if (reason === "no chat id configured") return false;
  if (reason.startsWith("not configured")) return false;
  return true;
}

export type TelegramConnectionIssue = {
  /** How many of the most recent send attempts (walking back from newest,
   * stopping at the first successful send) failed for a connection reason. */
  count: number;
  reason: string;
  chatId: string | null;
};

/**
 * Module-agnostic (TelegramSettings/TelegramLogEntry aren't scoped to
 * Service Centre specifically) check for whether a partner's most recent
 * Telegram sends have been failing for a reason they can actually fix by
 * reconnecting — e.g. the bot was blocked, the chat/group was deleted, or a
 * send otherwise failed outright. Backs the actionable notification banner
 * on the Telegram Alerts page (replacing the old raw activity-log section).
 * Returns null when there's nothing actionable to show: no recent attempts,
 * fewer than 2 consecutive connection-reason failures, or the most recent
 * attempt already succeeded.
 */
export async function getRecentTelegramConnectionIssue(partnerId: string, sampleSize = 5): Promise<TelegramConnectionIssue | null> {
  const recent = await getTelegramLog(partnerId, sampleSize);
  let count = 0;
  let reason: string | null = null;
  let chatId: string | null = null;
  for (const entry of recent) {
    if (entry.sent) break;
    if (isConnectionFailureReason(entry.reason)) {
      count += 1;
      if (!reason) {
        reason = entry.reason;
        chatId = entry.chatId;
      }
    }
  }
  if (count < 2 || !reason) return null;
  return { count, reason, chatId };
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
 * Sends one cadence of the scheduled business-summary digest to a partner's
 * connected chat(s) (honouring routing["report"] — "none" opts out) and
 * stamps that cadence's entry in `lastReportSentAt` so
 * /api/cron/telegram-reports's idempotency check sees this partner/cadence
 * as done for the current period even if the cron runs again the same day
 * (Vercel Cron doesn't guarantee exactly-once). Stamped regardless of
 * whether a chat is actually connected/a bot token is configured --
 * "attempted for this period" is the right idempotency signal, not
 * "successfully delivered".
 */
export async function sendPartnerTelegramReport(partnerId: string, cadence: TelegramReportCadence, message: string): Promise<void> {
  await sendTelegramAlertInternal(partnerId, "report", message, null);
  const existing = await getTelegramSettings(partnerId);
  // Json column -- store ISO strings, not Date objects, so the round-trip
  // through parseLastReportSentAt() above stays well-defined.
  const nextStamps: Record<string, string> = {};
  for (const [key, value] of Object.entries(existing.lastReportSentAt)) {
    if (value) nextStamps[key] = value.toISOString();
  }
  nextStamps[cadence] = new Date().toISOString();
  await prisma.telegramSettings
    .update({ where: { partnerId }, data: { lastReportSentAt: nextStamps } })
    .catch(() => {});
}

/**
 * Reverse lookup for command handling in the webhook route: given the chat
 * id an incoming Telegram command arrived on, which partner (if any) has it
 * connected as either its personal or group chat. Null means this chat
 * isn't connected to any partner — commands from it get a "not connected"
 * reply rather than being silently ignored.
 */
export async function findPartnerIdByChatId(chatId: string): Promise<string | null> {
  const row = await prisma.telegramSettings.findFirst({
    where: { OR: [{ chatId }, { groupChatId: chatId }] },
    select: { partnerId: true },
  });
  return row?.partnerId ?? null;
}

/**
 * Direct, unlogged send to an arbitrary chat id — used only for replying to
 * a bot command in the exact chat it came from (test-template previews,
 * /help, on-demand /report_* pulls). Deliberately bypasses
 * TelegramSettings.enabledTypes/routing entirely: a command is an explicit
 * pull the chat just asked for, not a push subscription, so those
 * per-alert-type settings don't apply. Still a no-op (not a throw) with no
 * bot token configured, matching every other send path's graceful
 * degradation.
 */
/**
 * Returns the Bot API's own message_id for the sent message (or null if
 * unconfigured/failed) — existing callers all discard this (previously
 * void), so widening the return type is backward compatible. Needed by
 * anything that wants a later reply-to-this-message to resolve back to
 * something (see src/lib/supportTickets.ts's live-chat threading, which
 * mirrors the same pattern sendWorkorderTelegramAlert already uses via
 * TelegramLogEntry.messageId).
 */
export async function sendRawTelegramMessage(chatId: string, text: string, replyToMessageId?: number): Promise<number | null> {
  const botToken = env.telegramBotToken();
  if (!botToken) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.ok) return null;
    return (body.result?.message_id as number | undefined) ?? null;
  } catch (err) {
    console.error("[telegram] command reply send failed:", err);
    return null;
  }
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
 * per chat slot.
 *
 * Personal slot: https://t.me/<bot_username>?start=<payload> — opens a
 * private chat with the bot and sends `/start <payload>` there once Start
 * is tapped, per Telegram's own deep-link behavior for a normal `start`
 * parameter (always targets the bot's own DM, never a group).
 *
 * Group slot: https://t.me/<bot_username>?startgroup=<payload> — a DIFFERENT
 * Telegram deep-link parameter, specifically for "add this bot to a group I
 * pick" (opens Telegram's own group picker instead of a DM). Using plain
 * `start=` here would be wrong: it would open a private chat with whoever
 * scanned it and connect THEIR OWN DM under the group slot, not any actual
 * group — Telegram has no `start=` mechanism that can target a group at
 * all, `startgroup=` is the one that does. Once the picked group is joined,
 * Telegram delivers the same `/start <payload>` message to the bot, but
 * with message.chat now correctly being that group — same webhook handler
 * (parseStartPayload/connectTelegramChat below) handles both cases
 * identically, only the deep-link parameter differs.
 *
 * Returns null when TELEGRAM_BOT_USERNAME isn't configured yet, so the page
 * can show a "not set up" state instead of a dead link.
 */
export function buildTelegramConnectLink(partnerId: string, slot: TelegramChatSlot = "personal"): string | null {
  const rawUsername = env.telegramBotUsername();
  if (!rawUsername) return null;
  // t.me links take the bare handle, no leading "@" — TELEGRAM_BOT_USERNAME
  // is sometimes entered as "@mybizflowbot" (how @BotFather displays it),
  // which otherwise produces an invalid "t.me/@mybizflowbot" link that
  // Telegram can't resolve to a bot and just shows its generic app page.
  const username = rawUsername.replace(/^@/, "");
  const payload = `${partnerId}${START_PAYLOAD_SLOT_SUFFIX[slot]}`;
  const param = slot === "group" ? "startgroup" : "start";
  return `https://t.me/${username}?${param}=${encodeURIComponent(payload)}`;
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
 * an automatic per-slot capture. Preserves whatever routing/other chat slot
 * the partner already had configured (or the defaults, for a brand-new
 * connection).
 */
export async function connectTelegramChat(
  partnerId: string,
  chatId: string,
  slot: TelegramChatSlot = "personal",
  /** Friendly display name captured from Telegram's own chat data on this
   * `/start` — see the webhook route's deriveChatDisplayName(). */
  title?: string | null
): Promise<void> {
  const existing = await getTelegramSettings(partnerId);
  if (slot === "group") {
    await saveTelegramSettings(partnerId, existing.chatId ?? "", {
      groupChatId: chatId,
      routing: existing.routing,
      groupChatTitle: title ?? null,
    });
  } else {
    await saveTelegramSettings(partnerId, chatId, {
      groupChatId: existing.groupChatId ?? "",
      routing: existing.routing,
      chatTitle: title ?? null,
    });
  }
}

/** Clears one of a partner's connected chats — the "Disconnect" affordance
 * on the Telegram Alerts page, now per-slot since personal and group
 * connect/disconnect independently. */
export async function disconnectTelegramChat(partnerId: string, slot: TelegramChatSlot = "personal"): Promise<void> {
  const existing = await getTelegramSettings(partnerId);
  if (slot === "group") {
    await saveTelegramSettings(partnerId, existing.chatId ?? "", {
      groupChatId: "",
      routing: existing.routing,
    });
  } else {
    await saveTelegramSettings(partnerId, "", {
      groupChatId: existing.groupChatId ?? "",
      routing: existing.routing,
    });
  }
}
