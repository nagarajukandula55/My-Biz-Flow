/**
 * Platform-ops config that used to only be settable via env vars — right
 * now, the two Telegram group chat IDs: one for business-facing ops
 * notifications (signups, bookings, support tickets, billing-cron
 * failures), one for application error alerts. Backed by a singleton
 * `PlatformSettings` row (see prisma/schema.prisma) so the separate
 * My-Biz-Flow-Admin app can edit them against the same physical DB without
 * a redeploy here. Each getter falls back to its env var when the DB value
 * is unset, so nothing breaks before the admin app's settings UI ships.
 */

import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

const SETTINGS_ID = "platform";

async function getSettings() {
  return prisma.platformSettings.findUnique({ where: { id: SETTINGS_ID } });
}

/** The Telegram group for business-facing ops notifications (signups, bookings, support tickets, billing failures). */
export async function getOpsChatId(): Promise<string | undefined> {
  const row = await getSettings();
  return row?.opsChatId || env.telegramOpsChatId();
}

/** The Telegram group for application error alerts (see src/lib/errorLog.ts). */
export async function getErrorChatId(): Promise<string | undefined> {
  const row = await getSettings();
  return row?.errorChatId || undefined;
}

export async function saveOpsChatId(chatId: string | null): Promise<void> {
  await prisma.platformSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, opsChatId: chatId },
    update: { opsChatId: chatId },
  });
}

export async function saveErrorChatId(chatId: string | null): Promise<void> {
  await prisma.platformSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, errorChatId: chatId },
    update: { errorChatId: chatId },
  });
}
