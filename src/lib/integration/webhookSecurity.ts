import { createHmac, timingSafeEqual } from "node:crypto";

export type VerifiedWebhook = { eventId: string; eventType: string; timestamp: number; payload: Record<string, unknown> };

/**
 * Provider-neutral webhook boundary. Providers must sign the exact raw body
 * with HMAC-SHA256 and send `timestamp.eventId` as the signed message prefix.
 * The caller still owns persistence/idempotency; this helper only authenticates
 * the envelope before any business operation is attempted.
 */
export function verifySignedWebhook(input: {
  rawBody: string;
  signature: string;
  timestamp: string;
  eventId: string;
  eventType: string;
  secret: string;
  nowMs?: number;
  maxAgeSeconds?: number;
}): VerifiedWebhook {
  if (!input.rawBody || !input.signature || !input.timestamp || !input.eventId || !input.eventType || !input.secret) throw new Error("Incomplete webhook envelope.");
  const timestamp = Number(input.timestamp);
  if (!Number.isInteger(timestamp) || timestamp <= 0) throw new Error("Invalid webhook timestamp.");
  const maxAge = input.maxAgeSeconds ?? 300;
  if (!Number.isInteger(maxAge) || maxAge < 1 || maxAge > 3600) throw new Error("Invalid webhook replay window.");
  const age = Math.abs((input.nowMs ?? Date.now()) - timestamp * 1000);
  if (age > maxAge * 1000) throw new Error("Webhook timestamp is outside the replay window.");
  const expected = createHmac("sha256", input.secret).update(`${timestamp}.${input.eventId}.${input.rawBody}`, "utf8").digest("hex");
  const received = input.signature.trim().replace(/^sha256=/i, "");
  if (!/^[a-f0-9]{64}$/i.test(received)) throw new Error("Invalid webhook signature.");
  if (!timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"))) throw new Error("Webhook signature mismatch.");
  let payload: unknown;
  try { payload = JSON.parse(input.rawBody); } catch { throw new Error("Webhook body must be valid JSON."); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Webhook body must be a JSON object.");
  return { eventId: input.eventId, eventType: input.eventType, timestamp, payload: payload as Record<string, unknown> };
}
