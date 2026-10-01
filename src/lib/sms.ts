import { env } from "@/lib/env";
import { buildSmsFlowPayload, getSmsFlowMapping } from "@/lib/smsFlowMapping";

export async function sendSms(to: string, message: string, context: { purpose: string; values?: Record<string, string> } = { purpose: "general" }): Promise<boolean> {
  const apiKey = env.smsApiKey();
  if (!apiKey) return false;
  try {
    const mapping = await getSmsFlowMapping(context.purpose);
    if (!mapping) return false;
    const payload = buildSmsFlowPayload(mapping, to, { message, phone: to, ...context.values });
    const response = await fetch("https://api.msg91.com/api/v5/flow/", {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: { "Content-Type": "application/json", authkey: apiKey },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => null);
    return response.ok && result?.type === "success" && typeof result.message === "string";
  } catch (err) {
    // Never let a failed SMS ping break the caller's transaction — this is
    // a best-effort notification, not a required step.
    console.error("[sms] send failed:", err);
    return false;
  }
}
