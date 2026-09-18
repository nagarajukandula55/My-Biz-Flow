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

/**
 * Sends a Meta-APPROVED template message (type: "template") — the only way
 * to reliably reach someone who hasn't messaged this WhatsApp number first
 * (sendWhatsAppMessage's free-form text only works within an existing 24h
 * customer-initiated conversation window, which a cold-called lead usually
 * isn't in). `bodyParams` fills the template's {{1}}, {{2}}, ... in order —
 * e.g. for "lead_welcome" (name, link): ["Rajesh", "https://mybizflow.in"].
 * Returns true only once Meta's API actually accepts the send (a real HTTP
 * 200 with a message id) — false for anything else (not configured,
 * template not yet approved, rejected, network failure), so a caller can
 * show an honest "sent"/"not sent" confirmation instead of assuming success.
 */
export async function sendWhatsAppTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string,
  bodyParams: string[]
): Promise<boolean> {
  const phoneNumberId = env.whatsappBusinessPhoneNumberId();
  const accessToken = env.whatsappAccessToken();

  if (!phoneNumberId || !accessToken) {
    console.log(`[whatsapp:not-configured] would send template "${templateName}" to ${to}`);
    return false;
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/[^\d]/g, ""),
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          components:
            bodyParams.length > 0
              ? [{ type: "body", parameters: bodyParams.map((text) => ({ type: "text", text })) }]
              : undefined,
        },
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.messages?.[0]?.id) {
      console.error(`[whatsapp] template "${templateName}" send failed:`, body?.error ?? res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[whatsapp] template send failed:", err);
    return false;
  }
}
