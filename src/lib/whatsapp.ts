/**
 * WhatsApp Business (Meta Cloud API) integration — optional, cost-free by
 * default. If WHATSAPP_BUSINESS_PHONE_NUMBER_ID/WHATSAPP_ACCESS_TOKEN
 * (src/lib/env.ts) aren't set, this no-ops with a console log instead of
 * throwing, same graceful-degradation posture as src/lib/sms.ts. Sends a
 * free-form text message — for the first message in a new 24h conversation
 * window, Meta requires an approved message TEMPLATE instead (WhatsApp's
 * own template system, not this app's MessageTemplate model); that approval
 * flow isn't wired up here yet, so this only reliably delivers replies
 * within an existing customer-initiated conversation window until it is.
 */
import { env } from "@/lib/env";

export async function sendWhatsAppMessage(to: string, message: string): Promise<void> {
  const phoneNumberId = env.whatsappBusinessPhoneNumberId();
  const accessToken = env.whatsappAccessToken();

  if (!phoneNumberId || !accessToken) {
    console.log(`[whatsapp:not-configured] would send to ${to}: ${message}`);
    return;
  }

  try {
    await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/[^\d]/g, ""),
        type: "text",
        text: { body: message },
      }),
    });
  } catch (err) {
    // Never let a failed WhatsApp send break the caller's transaction — this
    // is a best-effort notification, not a required step.
    console.error("[whatsapp] send failed:", err);
  }
}
