"use server";

import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import {
  getTelegramSettings,
  saveTelegramSettings,
  saveTelegramRouting,
  sendPartnerTelegramAlert,
  TELEGRAM_ALERT_TYPES,
  type AlertDestination,
  type TelegramRoutingKey,
  type TelegramRoutingMap,
} from "@/lib/telegram";

/** Every routing key the form submits a `routing_<key>` select for — every
 * alert type plus the "report" digest's own routing selector. */
const ALL_ROUTING_KEYS: TelegramRoutingKey[] = [...TELEGRAM_ALERT_TYPES.map((t) => t.key), "report"];

function readRoutingFromForm(formData: FormData): TelegramRoutingMap {
  const validDestinations = new Set<AlertDestination>(["personal", "group", "both", "none"]);
  const routing: TelegramRoutingMap = {};
  for (const key of ALL_ROUTING_KEYS) {
    const raw = String(formData.get(`routing_${key}`) ?? "both") as AlertDestination;
    routing[key] = validDestinations.has(raw) ? raw : "both";
  }
  return routing;
}

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
  const routing = readRoutingFromForm(formData);

  await saveTelegramSettings(partnerId, chatId, { groupChatId, routing });
  revalidatePath(`/partner/${partnerId}/service-centre/telegram`);
}

/** Saves only the per-alert-type (+ report) routing map — used when the
 * routing controls are submitted on their own rather than through the main
 * settings form (kept in sync with saveTelegramSettingsAction's validation). */
export async function saveTelegramRoutingAction(partnerId: string, formData: FormData): Promise<void> {
  await requireSessionPartnerId(partnerId);
  await saveTelegramRouting(partnerId, readRoutingFromForm(formData));
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
