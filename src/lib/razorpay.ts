/**
 * Razorpay integration — real REST calls (Basic Auth over key id/secret),
 * no SDK dependency. Two verification paths, both real:
 *  1. Checkout success signature (order_id|payment_id HMAC'd with the key
 *     secret) — verified synchronously right after the customer pays, see
 *     /api/razorpay/verify.
 *  2. Webhook signature (raw body HMAC'd with the webhook secret) — for
 *     the /api/razorpay/webhook route, if a webhook is registered in the
 *     Razorpay dashboard. Optional; the app doesn't require it.
 *
 * Requires RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET (src/lib/env.ts) — until a
 * Super Admin adds real keys in Vercel, createOrder() throws a clear
 * "not configured" error rather than silently failing.
 */
import { createHmac, timingSafeEqual } from "crypto";
import { env } from "@/lib/env";

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

function requireCredentials(): { keyId: string; keySecret: string } {
  const keyId = env.razorpayKeyId();
  const keySecret = env.razorpayKeySecret();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }
  return { keyId, keySecret };
}

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
};

/** Creates a Razorpay Order for one payment. amountInPaise = rupees * 100. */
export async function createOrder(amountInPaise: number, receipt: string, notes: Record<string, string>): Promise<RazorpayOrder> {
  const { keyId, keySecret } = requireCredentials();
  const res = await fetch(`${RAZORPAY_API_BASE}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
    body: JSON.stringify({ amount: amountInPaise, currency: "INR", receipt, notes }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Razorpay order creation failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return { id: data.id, amount: data.amount, currency: data.currency };
}

function hmacHex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Verifies the signature Razorpay Checkout returns on successful payment. */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const { keySecret } = requireCredentials();
  const expected = hmacHex(keySecret, `${orderId}|${paymentId}`);
  return safeEqual(expected, signature);
}

/** Verifies a Razorpay webhook's X-Razorpay-Signature header against the raw request body. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = env.razorpayWebhookSecret();
  if (!secret) throw new Error("Razorpay webhook secret is not configured — set RAZORPAY_WEBHOOK_SECRET.");
  const expected = hmacHex(secret, rawBody);
  return safeEqual(expected, signature);
}
