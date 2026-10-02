import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";

// Platform-owned records, outside every real partner's writable namespace.
export const DELIVERY_OWNER = "__platform_payment_delivery__";
export const DELIVERY_MODULE = "platform-payment-delivery";
export type DeliveryChannel = "accounting" | "email" | "telegram" | "wallet_commission";
export type PaymentDelivery = {
  partnerId: string;
  razorpayPaymentId: string;
  amount: number;
  planName: string;
  billingCycle: string;
  capturedAt: string;
  /** Set only when this was the referred partner's first-ever captured payment AND they were referred. */
  referrer?: { type: "PARTNER" | "STAFF"; id: string };
};
export type DeliveryJob = { payment: PaymentDelivery; channel: DeliveryChannel; status: string; attempts: number; lease?: string; startedAt?: string; completedAt?: string };

export async function enqueuePaymentDelivery(tx: Prisma.TransactionClient, payment: PaymentDelivery) {
  const channels: DeliveryChannel[] = ["accounting", "email", "telegram"];
  // Only queued when there's an actual commission to pay — avoids a
  // permanently-"Review" job for every organic (non-referred) or renewal
  // payment, which would otherwise need manual triage for no reason.
  if (payment.referrer) channels.push("wallet_commission");
  for (const channel of channels) {
    const key = { partnerId: DELIVERY_OWNER, moduleSlug: DELIVERY_MODULE, recordKey: `${payment.razorpayPaymentId}:${channel}` };
    await tx.businessRecord.upsert({ where: { partnerId_moduleSlug_recordKey: key }, update: {},
      create: { ...key, data: { payment, channel, status: "Pending", attempts: 0 } } });
  }
}

/** Claims one durable job. An interrupted delivery requires review, never an automatic duplicate send. */
export async function processPaymentDelivery(send: (job: DeliveryJob) => Promise<boolean>, paymentId?: string): Promise<boolean> {
  const claimed = await prisma.$transaction(async tx => {
    const rows = await tx.$queryRaw<{ id: string; data: Prisma.JsonValue }[]>`
      SELECT id, data FROM business_records
      WHERE "partnerId" = ${DELIVERY_OWNER} AND "moduleSlug" = ${DELIVERY_MODULE}
        AND (data->>'status' = 'Pending' OR (data->>'status' = 'Processing' AND "updatedAt" < (NOW() AT TIME ZONE 'UTC') - interval '10 minutes'))
        AND (${paymentId ?? null}::text IS NULL OR data->'payment'->>'razorpayPaymentId' = ${paymentId ?? null})
      ORDER BY "createdAt" LIMIT 1 FOR UPDATE SKIP LOCKED`;
    if (!rows.length) return null;
    const row = rows[0], job = row.data as unknown as DeliveryJob;
    if (job.status === "Processing") {
      await tx.businessRecord.update({ where: { id: row.id }, data: { data: { ...job, status: "Review", lease: null } as unknown as Prisma.InputJsonValue } });
      return { interrupted: true as const };
    }
    const next = { ...job, status: "Processing", attempts: job.attempts + 1, lease: randomUUID(), startedAt: new Date().toISOString() };
    await tx.businessRecord.update({ where: { id: row.id }, data: { data: next as unknown as Prisma.InputJsonValue } });
    return { interrupted: false as const, id: row.id, job: next };
  });
  if (!claimed) return false;
  if (claimed.interrupted) return true;
  let accepted = false;
  try {
    const payment = await prisma.subscriptionPayment.findUnique({ where: { razorpayPaymentId: claimed.job.payment.razorpayPaymentId } });
    if (payment && payment.partnerId === claimed.job.payment.partnerId && payment.amount === claimed.job.payment.amount) accepted = await send(claimed.job);
  } catch { /* Ambiguous network outcomes are reviewable, never silently replayed. */ }
  await prisma.businessRecord.updateMany({ where: { id: claimed.id, partnerId: DELIVERY_OWNER,
    data: { path: ["lease"], equals: claimed.job.lease } },
    data: { data: { ...claimed.job, status: accepted ? "Accepted" : "Review", completedAt: new Date().toISOString() } as unknown as Prisma.InputJsonValue } });
  return true;
}
