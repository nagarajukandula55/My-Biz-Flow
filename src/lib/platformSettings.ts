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
import type { ReportFrequency } from "@/lib/telegramTemplates";

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

/**
 * Which WhatsApp automated-message trigger keys are currently turned on,
 * platform-wide — see src/lib/whatsappTriggers.ts for the registry of
 * trigger keys and src/lib/telecalling/callsData.ts for the first one
 * (telecalling.leadAccepted). Empty by default: every trigger stays off
 * until explicitly enabled from the separate My-Biz-Flow-Admin app.
 */
export async function getEnabledWhatsappTriggers(): Promise<string[]> {
  const row = await getSettings();
  const value = row?.enabledWhatsappTriggers;
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export async function setWhatsappTriggerEnabled(triggerKey: string, enabled: boolean): Promise<void> {
  const current = await getEnabledWhatsappTriggers();
  const next = enabled ? Array.from(new Set([...current, triggerKey])) : current.filter((k) => k !== triggerKey);
  await prisma.platformSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, enabledWhatsappTriggers: next },
    update: { enabledWhatsappTriggers: next },
  });
}

/** Per-cadence last-sent stamp for the platform's own growth digest (src/lib/platformReportData.ts) — mirrors TelegramSettings.lastReportSentAt's shape, just for the one platform-wide "account" instead of per-partner. */
export async function getLastPlatformReportSentAt(): Promise<Partial<Record<ReportFrequency, Date>>> {
  const row = await getSettings();
  const raw = row?.lastPlatformReportSentAt;
  const out: Partial<Record<ReportFrequency, Date>> = {};
  if (raw && typeof raw === "object") {
    for (const cadence of ["DAILY", "WEEKLY", "MONTHLY"] as ReportFrequency[]) {
      const value = (raw as Record<string, unknown>)[cadence];
      if (typeof value === "string" && value) out[cadence] = new Date(value);
    }
  }
  return out;
}

export async function setLastPlatformReportSentAt(cadence: ReportFrequency, sentAt: Date): Promise<void> {
  const current = await getLastPlatformReportSentAt();
  const next: Record<string, string> = {};
  for (const [c, d] of Object.entries(current)) next[c] = d.toISOString();
  next[cadence] = sentAt.toISOString();
  await prisma.platformSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, lastPlatformReportSentAt: next },
    update: { lastPlatformReportSentAt: next },
  });
}
