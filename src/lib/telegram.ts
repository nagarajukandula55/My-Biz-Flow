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

export type TelegramSettingsRecord = {
  partnerId: string;
  chatId: string | null;
  enabledTypes: TelegramAlertType[];
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
    enabledTypes: (row?.enabledTypes as TelegramAlertType[] | undefined) ?? [],
    reportFrequency: (row?.reportFrequency as TelegramReportFrequency | undefined) ?? "NONE",
  };
}

export async function saveTelegramSettings(
  partnerId: string,
  chatId: string,
  enabledTypes: TelegramAlertType[],
  reportFrequency: TelegramReportFrequency
): Promise<void> {
  await prisma.telegramSettings.upsert({
    where: { partnerId },
    create: { partnerId, chatId: chatId || null, enabledTypes, reportFrequency },
    update: { chatId: chatId || null, enabledTypes, reportFrequency },
  });
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
 */
export async function sendPartnerTelegramAlert(
  partnerId: string,
  type: TelegramAlertType | "test",
  message: string
): Promise<void> {
  const settings = await getTelegramSettings(partnerId);

  if (!settings.chatId) {
    await recordTelegramLog({ partnerId, type, message, chatId: null, sent: false, reason: "no chat id configured" });
    return;
  }
  if (type !== "test" && !settings.enabledTypes.includes(type)) {
    await recordTelegramLog({ partnerId, type, message, chatId: settings.chatId, sent: false, reason: "alert type disabled" });
    return;
  }

  const botToken = env.telegramBotToken();
  if (!botToken) {
    console.log(`[telegram:not-configured] would send to partner ${partnerId} chat ${settings.chatId}: ${message}`);
    await recordTelegramLog({ partnerId, type, message, chatId: settings.chatId, sent: false, reason: "not configured — no TELEGRAM_BOT_TOKEN" });
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: settings.chatId, text: message, parse_mode: "Markdown" }),
    });
    await recordTelegramLog({ partnerId, type, message, chatId: settings.chatId, sent: true, reason: null });
  } catch (err) {
    console.error("[telegram] send failed:", err);
    await recordTelegramLog({ partnerId, type, message, chatId: settings.chatId, sent: false, reason: "send failed" });
  }
}
