/**
 * Telegram-verified access gate for a partner's own Customer database
 * (service-centre-customers) — contact details are private customer data,
 * so viewing the list/detail or exporting it requires a fresh one-time
 * code sent to the partner's own connected Telegram chat, not just being
 * logged in as the partner. One outstanding code per partner at a time
 * (CustomerDataAccessOtp, upserted on each new request); a successful
 * verify unlocks viewing for UNLOCK_MINUTES, after which it re-locks.
 */
import { createHash, randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { getTelegramSettings, sendRawTelegramMessage } from "@/lib/telegram";
import { getTelegramTemplateBody, renderTelegramTemplate } from "@/lib/telegramTemplatesData";

const CODE_TTL_MINUTES = 5;
const UNLOCK_MINUTES = 30;
const MAX_ATTEMPTS = 5;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function generateCode(): string {
  return String(randomInt(100000, 1000000)); // 6 digits, no leading-zero ambiguity to worry about since range excludes it
}

export type RequestOtpResult = { sent: boolean; reason?: "not_connected" | "send_failed" };

/** Generates a fresh code, stores it hashed, and sends it to the partner's connected personal Telegram chat. */
export async function requestCustomerDataOtp(partnerId: string): Promise<RequestOtpResult> {
  const settings = await getTelegramSettings(partnerId);
  if (!settings.chatId) return { sent: false, reason: "not_connected" };

  const code = generateCode();
  const now = new Date();
  await prisma.customerDataAccessOtp.upsert({
    where: { partnerId },
    update: { codeHash: hashCode(code), expiresAt: new Date(now.getTime() + CODE_TTL_MINUTES * 60_000), attempts: 0 },
    create: { partnerId, codeHash: hashCode(code), expiresAt: new Date(now.getTime() + CODE_TTL_MINUTES * 60_000) },
  });

  const body = await getTelegramTemplateBody("customer_data_otp");
  const message = renderTelegramTemplate(body, { code });
  try {
    await sendRawTelegramMessage(settings.chatId, message);
    return { sent: true };
  } catch {
    return { sent: false, reason: "send_failed" };
  }
}

export type VerifyOtpResult = { verified: boolean; reason?: "no_pending_code" | "expired" | "too_many_attempts" | "incorrect" };

/** Checks the submitted code and, on success, unlocks customer data for UNLOCK_MINUTES. */
export async function verifyCustomerDataOtp(partnerId: string, code: string): Promise<VerifyOtpResult> {
  const row = await prisma.customerDataAccessOtp.findUnique({ where: { partnerId } });
  if (!row) return { verified: false, reason: "no_pending_code" };
  if (row.attempts >= MAX_ATTEMPTS) return { verified: false, reason: "too_many_attempts" };
  if (row.expiresAt < new Date()) return { verified: false, reason: "expired" };

  if (hashCode(code.trim()) !== row.codeHash) {
    await prisma.customerDataAccessOtp.update({ where: { partnerId }, data: { attempts: { increment: 1 } } });
    return { verified: false, reason: "incorrect" };
  }

  await prisma.customerDataAccessOtp.update({
    where: { partnerId },
    data: { verifiedUntil: new Date(Date.now() + UNLOCK_MINUTES * 60_000) },
  });
  return { verified: true };
}

/** True if this partner currently has an unexpired unlock — the actual gate check every customer page/export uses. */
export async function isCustomerDataUnlocked(partnerId: string): Promise<boolean> {
  const row = await prisma.customerDataAccessOtp.findUnique({ where: { partnerId } });
  return Boolean(row?.verifiedUntil && row.verifiedUntil > new Date());
}

/** Re-locks immediately — an explicit "Lock" action, e.g. before handing the device to someone else. */
export async function lockCustomerData(partnerId: string): Promise<void> {
  await prisma.customerDataAccessOtp.updateMany({ where: { partnerId }, data: { verifiedUntil: null } });
}
