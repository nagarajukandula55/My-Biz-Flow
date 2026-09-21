/**
 * Telegram-verified one-time-code gate for reopening a workorder that has
 * already reached "Completed" back to "In Progress" — same shape as
 * customerDataAccess.ts's Telegram OTP, but scoped per-workorder rather
 * than per-partner. A successful verify unlocks the reopen action for
 * UNLOCK_MINUTES, during which reopenWorkorderAction may actually run.
 */
import { createHash, randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { getTelegramSettings, sendRawTelegramMessage } from "@/lib/telegram";

const CODE_TTL_MINUTES = 5;
const UNLOCK_MINUTES = 10;
const MAX_ATTEMPTS = 5;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function generateCode(): string {
  return String(randomInt(100000, 1000000));
}

export type RequestReopenOtpResult = { sent: boolean; reason?: "not_connected" | "send_failed" };

/** Generates a fresh code, stores it hashed, and sends it to the partner's connected personal (Owner) Telegram chat. */
export async function requestWorkorderReopenOtp(
  partnerId: string,
  workorderId: string,
  workorderLabel: string
): Promise<RequestReopenOtpResult> {
  const settings = await getTelegramSettings(partnerId);
  if (!settings.chatId) return { sent: false, reason: "not_connected" };

  const code = generateCode();
  const now = new Date();
  await prisma.workorderReopenOtp.upsert({
    where: { workorderId },
    update: { partnerId, codeHash: hashCode(code), expiresAt: new Date(now.getTime() + CODE_TTL_MINUTES * 60_000), attempts: 0 },
    create: { workorderId, partnerId, codeHash: hashCode(code), expiresAt: new Date(now.getTime() + CODE_TTL_MINUTES * 60_000) },
  });

  const message = `Reopen request for workorder ${workorderLabel}\n\nCode: ${code}\n\nThis code expires in ${CODE_TTL_MINUTES} minutes. Share it only if you personally approve moving this Completed job back to In Progress.`;
  try {
    await sendRawTelegramMessage(settings.chatId, message);
    return { sent: true };
  } catch {
    return { sent: false, reason: "send_failed" };
  }
}

export type VerifyReopenOtpResult = {
  verified: boolean;
  reason?: "no_pending_code" | "expired" | "too_many_attempts" | "incorrect";
};

/** Checks the submitted code and, on success, unlocks the reopen action for UNLOCK_MINUTES. */
export async function verifyWorkorderReopenOtp(workorderId: string, code: string): Promise<VerifyReopenOtpResult> {
  const row = await prisma.workorderReopenOtp.findUnique({ where: { workorderId } });
  if (!row) return { verified: false, reason: "no_pending_code" };
  if (row.attempts >= MAX_ATTEMPTS) return { verified: false, reason: "too_many_attempts" };
  if (row.expiresAt < new Date()) return { verified: false, reason: "expired" };

  if (hashCode(code.trim()) !== row.codeHash) {
    await prisma.workorderReopenOtp.update({ where: { workorderId }, data: { attempts: { increment: 1 } } });
    return { verified: false, reason: "incorrect" };
  }

  await prisma.workorderReopenOtp.update({
    where: { workorderId },
    data: { verifiedUntil: new Date(Date.now() + UNLOCK_MINUTES * 60_000) },
  });
  return { verified: true };
}

/** True if this workorder currently has an unexpired reopen unlock. */
export async function isWorkorderReopenUnlocked(workorderId: string): Promise<boolean> {
  const row = await prisma.workorderReopenOtp.findUnique({ where: { workorderId } });
  return Boolean(row?.verifiedUntil && row.verifiedUntil > new Date());
}

/** Consumes the unlock so a single verified code can't be used to reopen twice. */
export async function consumeWorkorderReopenUnlock(workorderId: string): Promise<void> {
  await prisma.workorderReopenOtp.updateMany({ where: { workorderId }, data: { verifiedUntil: null } });
}
