/**
 * Telegram-delivered OTP gate for closing an Inventory record (Stock Take
 * close, Stock Transfer close, etc.) — backed by the generic, purpose-keyed
 * OtpCode model (prisma/schema.prisma), which is a table physically shared
 * with the separate My-Biz-Flow-Admin app (same live Postgres DB — see that
 * app's src/lib/inventoryOtp.ts for the reference implementation this file
 * mirrors). Delivery goes through this app's own sendPartnerTelegramAlert()
 * (src/lib/telegram.ts), which returns a plain boolean here (not Admin's
 * richer {sent, reason} result), so `sent` below is derived from that.
 *
 * Tenant-scoped per src/lib/tenant.ts conventions: every function takes
 * partnerId first and every query/write is filtered by it.
 */
import { prisma } from "@/lib/prisma";
import { sendPartnerTelegramAlert } from "@/lib/telegram";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

export type InventoryOtpPurpose = "stock-take-close" | "stock-transfer-close";

function generateSixDigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export type RequestInventoryOtpResult = { sent: boolean; reason?: "not_connected" };

/**
 * Generates and sends a fresh OTP for closing `targetRecordId` under
 * `purpose` (e.g. "stock-take-close"). Any prior unconsumed OtpCode for the
 * same (partnerId, targetRecordId, purpose) is deleted first, so only the
 * most recently requested code is ever valid — requesting a new code always
 * invalidates an old, unused one rather than letting both work.
 */
export async function requestInventoryOtp(
  partnerId: string,
  purpose: InventoryOtpPurpose,
  targetRecordId: string,
  /** Human-readable label for the document being closed, shown in the Telegram message (e.g. "Stock Take ST-2026-0042"). */
  targetLabel: string
): Promise<RequestInventoryOtpResult> {
  await prisma.otpCode.deleteMany({
    where: { partnerId, targetRecordId, purpose, consumedAt: null },
  });

  const code = generateSixDigitCode();
  const now = new Date();
  await prisma.otpCode.create({
    data: {
      partnerId,
      purpose,
      targetRecordId,
      code,
      expiresAt: new Date(now.getTime() + OTP_TTL_MS),
    },
  });

  const message = `Close request for ${targetLabel}\n\nCode: ${code}\n\nThis code expires in 10 minutes. Share it only if you personally approve closing this document.`;
  const delivered = await sendPartnerTelegramAlert(partnerId, "otpVerification", message);
  return delivered ? { sent: true } : { sent: false, reason: "not_connected" };
}

export type VerifyInventoryOtpResult = {
  verified: boolean;
  reason?: "no_pending_code" | "expired" | "incorrect";
};

/**
 * Verifies `code` against the latest unconsumed, unexpired OtpCode row for
 * (partnerId, targetRecordId, purpose). Marks it consumed on success so it
 * can't be reused. Never throws on an expected failure path (no code
 * requested, expired, wrong code) — those are ordinary `verified: false`
 * results.
 */
export async function verifyInventoryOtp(
  partnerId: string,
  purpose: InventoryOtpPurpose,
  targetRecordId: string,
  code: string
): Promise<VerifyInventoryOtpResult> {
  const row = await prisma.otpCode.findFirst({
    where: { partnerId, targetRecordId, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!row) return { verified: false, reason: "no_pending_code" };
  if (row.expiresAt.getTime() < Date.now()) return { verified: false, reason: "expired" };
  if (row.code !== code.trim()) return { verified: false, reason: "incorrect" };

  await prisma.otpCode.update({
    where: { id: row.id },
    data: { consumedAt: new Date() },
  });
  return { verified: true };
}
