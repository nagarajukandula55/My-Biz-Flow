"use server";

import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import {
  saveTelegramSettings,
  sendPartnerTelegramAlert,
  disconnectTelegramChat,
  TELEGRAM_ALERT_TYPES,
  TELEGRAM_REPORT_FREQUENCIES,
  type TelegramAlertType,
  type TelegramReportFrequency,
} from "@/lib/telegram";

export async function saveTelegramSettingsAction(partnerId: string, formData: FormData): Promise<void> {
  await requireSessionPartnerId(partnerId);

  const chatId = String(formData.get("chatId") ?? "").trim();
  const validKeys = new Set(TELEGRAM_ALERT_TYPES.map((t) => t.key));
  const enabledTypes = TELEGRAM_ALERT_TYPES.map((t) => t.key).filter(
    (key) => formData.get(`alert_${key}`) === "on" && validKeys.has(key)
  ) as TelegramAlertType[];

  const rawFrequency = String(formData.get("reportFrequency") ?? "NONE");
  const reportFrequency = (TELEGRAM_REPORT_FREQUENCIES as readonly string[]).includes(rawFrequency)
    ? (rawFrequency as TelegramReportFrequency)
    : "NONE";

  await saveTelegramSettings(partnerId, chatId, enabledTypes, reportFrequency);
  revalidatePath(`/partner/${partnerId}/service-centre/telegram`);
}

/** "Send Test Message" — matches AN-CRM's vendor Telegram page test-send
 * feature. Always records a real log entry via sendPartnerTelegramAlert,
 * whether or not a bot token is actually configured. */
export async function sendTestTelegramMessageAction(partnerId: string): Promise<void> {
  await requireSessionPartnerId(partnerId);
  await sendPartnerTelegramAlert(partnerId, "test", "🔔 This is a test message from your Telegram Alerts setup.");
  revalidatePath(`/partner/${partnerId}/service-centre/telegram`);
}

/**
 * "Disconnect" — clears the chat captured by the deep-link connect flow (or
 * a manually-entered chat id), so alerts stop going to that chat until the
 * partner connects again. Alert-type/report-frequency settings are kept.
 */
export async function disconnectTelegramAction(partnerId: string): Promise<void> {
  await requireSessionPartnerId(partnerId);
  await disconnectTelegramChat(partnerId);
  revalidatePath(`/partner/${partnerId}/service-centre/telegram`);
}
