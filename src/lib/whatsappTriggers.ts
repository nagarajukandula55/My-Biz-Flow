/**
 * Registry of automated WhatsApp trigger points — each one is real, working
 * code, but stays a no-op until its key is turned on via
 * PlatformSettings.enabledWhatsappTriggers (see platformSettings.ts),
 * editable from the separate My-Biz-Flow-Admin app against this same
 * database. Add a new trigger by: (1) adding its key/label/description
 * here, (2) calling isWhatsappTriggerEnabled(key) at the point in the code
 * where that event happens, guarding the actual sendWhatsAppMessage call.
 * Nothing here requires touching this file again to turn a trigger on —
 * that's a data change (the enabled-list), not a code change.
 */
import { getEnabledWhatsappTriggers } from "@/lib/platformSettings";

export type WhatsappTriggerKey = "telecalling.leadAccepted";

export const WHATSAPP_TRIGGERS: { key: WhatsappTriggerKey; label: string; description: string }[] = [
  {
    key: "telecalling.leadAccepted",
    label: "Telecalling — Lead Accepted",
    description:
      "Sends a WhatsApp message to the lead's own phone number automatically when a Telecalling agent logs a call's outcome as Accepted (see src/lib/telecalling/callsData.ts's logCall()).",
  },
];

export async function isWhatsappTriggerEnabled(key: WhatsappTriggerKey): Promise<boolean> {
  const enabled = await getEnabledWhatsappTriggers();
  return enabled.includes(key);
}
