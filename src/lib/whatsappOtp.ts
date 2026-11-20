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
import { createHash, randomInt, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { sendWhatsAppTemplateMessage } from "@/lib/whatsapp";
import { sendEmail, emailShell, emailInfoBox } from "@/lib/email";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes — same TTL as inventoryOtp.ts
const OTP_MAX_ATTEMPTS = 5;
const OTP_SEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_SENDS_PER_HOUR = 5;

export type LoginOtpPurpose = "partner-login" | "ff-customer-login" | "unified-customer-login" | "unified-provider-login" | "ff-job-start" | "ff-job-complete";

export type JobOtpPurpose = "ff-job-start" | "ff-job-complete";

function generateSixDigitCode(): string {
  return randomInt(100000, 1_000_000).toString();
}

function hashOtp(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function matchesOtp(expectedHash: string, submittedCode: string): boolean {
  const expected = Buffer.from(expectedHash, "hex");
  const actual = Buffer.from(hashOtp(submittedCode), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export type RequestLoginOtpResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "send_failed" | "rate_limited" };

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

  const now = new Date();
  const [latest, sentInLastHour] = await Promise.all([
    prisma.otpCode.findFirst({ where: { partnerId, targetRecordId, purpose }, orderBy: { createdAt: "desc" } }),
    prisma.otpCode.count({ where: { partnerId, targetRecordId, purpose, createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) } } }),
  ]);
  if (latest && latest.createdAt.getTime() > now.getTime() - OTP_SEND_COOLDOWN_MS) return { sent: false, reason: "rate_limited" };
  if (sentInLastHour >= OTP_MAX_SENDS_PER_HOUR) return { sent: false, reason: "rate_limited" };

  // Keep prior rows for rate limiting/audit, but ensure only the newest code can be used.
  await prisma.otpCode.updateMany({ where: { partnerId, targetRecordId, purpose, consumedAt: null }, data: { consumedAt: now } });

  const code = generateSixDigitCode();
  const otp = await prisma.otpCode.create({
    data: {
      partnerId,
      purpose,
      targetRecordId,
      code: "", // legacy non-null column; the real OTP is never stored in plaintext.
      codeHash: hashOtp(code),
      attempts: 0,
      expiresAt: new Date(now.getTime() + OTP_TTL_MS),
    },
  });

  // Meta Authentication templates with a Copy Code button are sent as a
  // dynamic URL button. The OTP must be supplied both in the body and in
  // that button's parameter; omitting the latter is rejected as #131008.
  const delivered = await sendWhatsAppTemplateMessage(
    toPhone,
    templateName,
    env.whatsappOtpTemplateLang(),
    [code],
    { buttonParams: [{ index: 0, subType: "url", text: code }] },
  );
  if (delivered) return { sent: true };
  // A provider rejection must not create a fake pending OTP or cause the next
  // genuine attempt to hit the cooldown/hourly limiter. The code was never
  // delivered, so remove only this newly-created row; prior rows remain audit history.
  await prisma.otpCode.delete({ where: { id: otp.id } }).catch(() => undefined);
  return { sent: false, reason: "send_failed" };
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
  if (row.attempts >= OTP_MAX_ATTEMPTS) return { verified: false, reason: "too_many_attempts" };
  const valid = row.codeHash ? matchesOtp(row.codeHash, code.trim()) : row.code === code.trim();
  if (!valid) {
    await prisma.otpCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    return { verified: false, reason: "incorrect" };
  }

  await prisma.otpCode.update({
    where: { id: row.id },
    data: { consumedAt: new Date() },
  });
  return { verified: true };
}

/** Customer-consent OTP used by a provider before starting or completing a job. */
export async function requestJobOtp(partnerId: string, purpose: JobOtpPurpose, bookingId: string, customerPhone: string, customerEmail?: string | null): Promise<RequestLoginOtpResult> {
  const whatsapp = await requestLoginOtp(partnerId, purpose, bookingId, customerPhone);
  if (whatsapp.sent || !customerEmail) return whatsapp;
  const code = generateSixDigitCode();
  const now = new Date();
  await prisma.otpCode.updateMany({ where: { partnerId, targetRecordId: bookingId, purpose, consumedAt: null }, data: { consumedAt: now } });
  await prisma.otpCode.create({ data: { partnerId, purpose, targetRecordId: bookingId, code: "", codeHash: hashOtp(code), attempts: 0, expiresAt: new Date(now.getTime() + OTP_TTL_MS) } });
  const label = purpose === "ff-job-start" ? "Job start OTP" : "Job completion OTP";
  const result = await sendEmail({
    to: customerEmail,
    subject: `${label} - My Biz Flow`,
    html: emailShell(`<h1 style="font-size:18px;color:#111827;">${label}</h1>${emailInfoBox([{ label: "OTP", value: code }, { label: "Validity", value: "10 minutes" }])}<p>Share this OTP with your service provider only when appropriate.</p>`),
    text: `${label}: ${code}\nValid for 10 minutes. Share this OTP with your service provider only when appropriate.`,
  });
  return result.sent ? { sent: true } : { sent: false, reason: "send_failed" };
}

export async function verifyJobOtp(partnerId: string, purpose: JobOtpPurpose, bookingId: string, code: string): Promise<VerifyLoginOtpResult> {
  return verifyLoginOtp(partnerId, purpose, bookingId, code);
}
