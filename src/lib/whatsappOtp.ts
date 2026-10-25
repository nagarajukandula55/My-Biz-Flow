/**
 * WhatsApp-delivered login OTP — a cold send (the person hasn't messaged
 * this WhatsApp number first), so unlike inventoryOtp.ts (which rides
 * Telegram) this must go out as a Meta-APPROVED template message
 * (sendWhatsAppTemplateMessage), never sendWhatsAppMessage's free-form text.
 * Reuses the same generic, purpose-keyed OtpCode table every other OTP flow
 * in this app already uses (prisma/schema.prisma — shared physically with
 * My-Biz-Flow-Admin) — no schema change needed, just two new `purpose`
 * values, so this is additive by construction.
 *
 * This is a second LOGIN METHOD alongside password/Google/Telegram, not a
 * replacement — see src/app/login/actions.ts (partner) and
 * src/lib/fieldForce/actions.ts (Field Force customer) for where each is
 * wired in.
 */
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { sendWhatsAppTemplateMessage } from "@/lib/whatsapp";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes — same TTL as inventoryOtp.ts

export type LoginOtpPurpose = "partner-login" | "ff-customer-login" | "ff-job-start" | "ff-job-complete";

export type JobOtpPurpose = "ff-job-start" | "ff-job-complete";

function generateSixDigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export type RequestLoginOtpResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "send_failed" };

/**
 * Generates and WhatsApp-sends a fresh OTP for (partnerId, purpose,
 * targetRecordId) — targetRecordId is the identity the code proves control
 * of (the partner's own id for "partner-login", the Customer row's id for
 * "ff-customer-login"). Any prior unconsumed code for the same triple is
 * deleted first, same "latest request wins" rule inventoryOtp.ts uses.
 */
export async function requestLoginOtp(
  partnerId: string,
  purpose: LoginOtpPurpose,
  targetRecordId: string,
  toPhone: string
): Promise<RequestLoginOtpResult> {
  const templateName = env.whatsappOtpTemplateName();
  if (!templateName) {
    console.log(`[whatsapp-otp:not-configured] would send login OTP to ${toPhone}`);
    return { sent: false, reason: "not_configured" };
  }

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

  const delivered = await sendWhatsAppTemplateMessage(toPhone, templateName, env.whatsappOtpTemplateLang(), [code]);
  return delivered ? { sent: true } : { sent: false, reason: "send_failed" };
}

export type VerifyLoginOtpResult = {
  verified: boolean;
  reason?: "no_pending_code" | "expired" | "incorrect" | "too_many_attempts";
};

/**
 * Verifies `code` against the latest unconsumed OtpCode row for (partnerId,
 * purpose, targetRecordId). A wrong code does not consume the row — it's
 * still pending and can be retried until it expires (same behavior as
 * verifyInventoryOtp in inventoryOtp.ts), which bounds brute force to the
 * OTP's 10-minute window.
 */
export async function verifyLoginOtp(
  partnerId: string,
  purpose: LoginOtpPurpose,
  targetRecordId: string,
  code: string
): Promise<VerifyLoginOtpResult> {
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

/** Customer-consent OTP used by a provider before starting or completing a job. */
export async function requestJobOtp(partnerId: string, purpose: JobOtpPurpose, bookingId: string, customerPhone: string): Promise<RequestLoginOtpResult> {
  return requestLoginOtp(partnerId, purpose, bookingId, customerPhone);
}

export async function verifyJobOtp(partnerId: string, purpose: JobOtpPurpose, bookingId: string, code: string): Promise<VerifyLoginOtpResult> {
  return verifyLoginOtp(partnerId, purpose, bookingId, code);
}
