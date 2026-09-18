"use server";

import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import {
  getTelegramSettings,
  saveTelegramSettings,
  saveTelegramRouting,
  sendPartnerTelegramAlert,
  TELEGRAM_ALERT_TYPES,
  TELEGRAM_REPORT_FREQUENCIES,
  type TelegramAlertType,
  type TelegramReportFrequency,
  type AlertDestination,
  type TelegramRoutingMap,
} from "@/lib/telegram";

export async function saveTelegramSettingsAction(partnerId: string, formData: FormData): Promise<void> {
  await requireSessionPartnerId(partnerId);

  // Once a slot is connected, only a Super Admin can change/clear it (see
  // My-Biz-Flow-Admin's subscriber edit page) — a partner can no longer
  // reconnect/overwrite it themselves, including via the "enter chat id
  // manually" form below, which posts through this same action. A submitted
  // value is only honored for a slot that isn't already connected.
  const existing = await getTelegramSettings(partnerId);
  const submittedChatId = String(formData.get("chatId") ?? "").trim();
  const submittedGroupChatId = String(formData.get("groupChatId") ?? "").trim();
  const chatId = existing.chatId ?? submittedChatId;
  const groupChatId = existing.groupChatId ?? submittedGroupChatId;
  const validKeys = new Set(TELEGRAM_ALERT_TYPES.map((t) => t.key));
  const enabledTypes = TELEGRAM_ALERT_TYPES.map((t) => t.key).filter(
    (key) => formData.get(`alert_${key}`) === "on" && validKeys.has(key)
  ) as TelegramAlertType[];

  const rawFrequency = String(formData.get("reportFrequency") ?? "NONE");
  const reportFrequency = (TELEGRAM_REPORT_FREQUENCIES as readonly string[]).includes(rawFrequency)
    ? (rawFrequency as TelegramReportFrequency)
    : "NONE";

  const validDestinations = new Set<AlertDestination>(["personal", "group", "both"]);
  const routing: TelegramRoutingMap = {};
  for (const t of TELEGRAM_ALERT_TYPES) {
    const raw = String(formData.get(`routing_${t.key}`) ?? "both") as AlertDestination;
    routing[t.key] = validDestinations.has(raw) ? raw : "both";
  }

  await saveTelegramSettings(partnerId, chatId, enabledTypes, reportFrequency, { groupChatId, routing });
  revalidatePath(`/partner/${partnerId}/service-centre/telegram`);
}

/** Saves only the per-alert-type routing map — used when the routing
 * controls are submitted on their own rather than through the main settings
 * form (kept in sync with saveTelegramSettingsAction's validation). */
export async function saveTelegramRoutingAction(partnerId: string, formData: FormData): Promise<void> {
  await requireSessionPartnerId(partnerId);

  const validDestinations = new Set<AlertDestination>(["personal", "group", "both"]);
  const routing: TelegramRoutingMap = {};
  for (const t of TELEGRAM_ALERT_TYPES) {
    const raw = String(formData.get(`routing_${t.key}`) ?? "both") as AlertDestination;
    routing[t.key] = validDestinations.has(raw) ? raw : "both";
  }

  await saveTelegramRouting(partnerId, routing);
  revalidatePath(`/partner/${partnerId}/service-centre/telegram`);
}

/** "Send Test Message" — matches AN-CRM's vendor Telegram page test-send
 * feature. Always records a real log entry via sendPartnerTelegramAlert,
 * whether or not a bot token is actually configured. Sends to every
 * connected chat (personal and group), ignoring routing, so it verifies
 * both slots at once. */
export async function sendTestTelegramMessageAction(partnerId: string): Promise<void> {
  await requireSessionPartnerId(partnerId);
  await sendPartnerTelegramAlert(partnerId, "test", "🔔 This is a test message from your Telegram Alerts setup.");
  revalidatePath(`/partner/${partnerId}/service-centre/telegram`);
}
