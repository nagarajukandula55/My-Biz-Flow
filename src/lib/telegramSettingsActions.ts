"use server";

import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { saveTelegramSettings, TELEGRAM_ALERT_TYPES, type TelegramAlertType } from "@/lib/telegram";

export async function saveTelegramSettingsAction(partnerId: string, formData: FormData): Promise<void> {
  await requireSessionPartnerId(partnerId);

  const chatId = String(formData.get("chatId") ?? "").trim();
  const validKeys = new Set(TELEGRAM_ALERT_TYPES.map((t) => t.key));
  const enabledTypes = TELEGRAM_ALERT_TYPES.map((t) => t.key).filter(
    (key) => formData.get(`alert_${key}`) === "on" && validKeys.has(key)
  ) as TelegramAlertType[];

  await saveTelegramSettings(partnerId, chatId, enabledTypes);
  revalidatePath(`/partner/${partnerId}/service-centre/telegram`);
}
