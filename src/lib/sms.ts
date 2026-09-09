/**
 * SMS "ping" integration — optional, cost-free by default. If
 * SMS_API_KEY/SMS_SENDER_ID (src/lib/env.ts) aren't set, this no-ops with a
 * console log instead of throwing, same graceful-degradation posture as
 * this repo's Razorpay integration when its keys are unset. Swap the
 * fetch() body below for a real vendor call (MSG91/Twilio/etc.) once keys
 * are added — every call site here stays unchanged.
 */
import { env } from "@/lib/env";

export async function sendSms(to: string, message: string): Promise<void> {
  const apiKey = env.smsApiKey();
  const senderId = env.smsSenderId();

  if (!apiKey || !senderId) {
    console.log(`[sms:not-configured] would send to ${to}: ${message}`);
    return;
  }

  try {
    await fetch("https://api.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: { "Content-Type": "application/json", authkey: apiKey },
      body: JSON.stringify({ sender: senderId, mobiles: to, message }),
    });
  } catch (err) {
    // Never let a failed SMS ping break the caller's transaction — this is
    // a best-effort notification, not a required step.
    console.error("[sms] send failed:", err);
  }
}
