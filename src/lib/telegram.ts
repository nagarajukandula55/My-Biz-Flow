/**
 * Per-partner Telegram alert settings + sender — mirrors src/lib/sms.ts's
 * graceful-degradation posture exactly: with no TELEGRAM_BOT_TOKEN set,
 * sendPartnerTelegramAlert() no-ops with a console log instead of throwing.
 * The settings themselves (chatId, which alert types are enabled) are real
 * and persisted in TelegramSettings — only the actual bot delivery needs a
 * real token this repo doesn't have.
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
] as const;

export type TelegramAlertType = (typeof TELEGRAM_ALERT_TYPES)[number]["key"];

export type TelegramSettingsRecord = {
  partnerId: string;
  chatId: string | null;
  enabledTypes: TelegramAlertType[];
};

export async function getTelegramSettings(partnerId: string): Promise<TelegramSettingsRecord> {
  const row = await prisma.telegramSettings.findUnique({ where: { partnerId } });
  return {
    partnerId,
    chatId: row?.chatId ?? null,
    enabledTypes: (row?.enabledTypes as TelegramAlertType[] | undefined) ?? [],
  };
}

export async function saveTelegramSettings(
  partnerId: string,
  chatId: string,
  enabledTypes: TelegramAlertType[]
): Promise<void> {
  await prisma.telegramSettings.upsert({
    where: { partnerId },
    create: { partnerId, chatId: chatId || null, enabledTypes },
    update: { chatId: chatId || null, enabledTypes },
  });
}

/**
 * Sends one alert to a partner's configured chat, IF they've enabled that
 * alert type and set a chatId, IF a bot is actually configured. Never
 * throws — this is best-effort, matching sendSms()'s posture.
 */
export async function sendPartnerTelegramAlert(
  partnerId: string,
  type: TelegramAlertType,
  message: string
): Promise<void> {
  const settings = await getTelegramSettings(partnerId);
  if (!settings.chatId || !settings.enabledTypes.includes(type)) return;

  const botToken = env.telegramBotToken();
  if (!botToken) {
    console.log(`[telegram:not-configured] would send to partner ${partnerId} chat ${settings.chatId}: ${message}`);
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: settings.chatId, text: message, parse_mode: "Markdown" }),
    });
  } catch (err) {
    console.error("[telegram] send failed:", err);
  }
}
