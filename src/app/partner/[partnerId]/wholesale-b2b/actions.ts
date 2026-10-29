"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { getPartner } from "@/lib/partnerData";
import { sendPartnerTelegramAlert } from "@/lib/telegram";
import { wholesaleLargeOrderMessage, wholesaleCreditLimitBreachMessage } from "@/lib/telegramTemplates";
import { createBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import {
  checkCreditLimit,
  createWholesaleOrder,
  getWholesaleOrder,
  isAllowedStatusTransition,
  paiseToRupees,
  updateWholesaleOrderStatus,
  type WholesaleOrderLineInput,
  type WholesaleOrderStatusValue,
} from "@/lib/wholesaleData";

/**
 * Creates a wholesale order from a customer + optional price tier + line
 * items. Recomputes the (possibly tier-discounted) totalAmount server-side
 * (never trusts client math), then runs the fail-closed credit-limit check
 * (see checkCreditLimit — 0 credit limit means unlimited, never blocks)
 * before persisting anything.
 */
export async function createWholesaleOrderAction(
  partnerId: string,
  values: { customerId: string; priceTierId?: string; orderDate: string; lines: WholesaleOrderLineInput[] }
): Promise<{ error?: string } | void> {
  partnerId = await requireSessionPartnerId(partnerId);

  const customerId = String(values.customerId ?? "").trim();
  if (!customerId) return { error: "Customer is required." };

  const lines = (values.lines ?? []).filter((l) => l.materialId && l.quantity > 0);
  if (lines.length === 0) return { error: "Add at least one line item with a positive quantity." };

  const orderDate = values.orderDate ? new Date(values.orderDate) : new Date();
  const priceTierId = values.priceTierId || null;

  // Compute the discounted total the same way createWholesaleOrder will, so
  // the credit-limit check runs against the REAL amount before anything is
  // written — checkCreditLimit re-derives discountPercent itself from
  // priceTierId, so this call is safe to make before the order row exists.
  const { computeOrderTotal } = await import("@/lib/wholesaleData");
  const { prisma } = await import("@/lib/prisma");
  const priceTier = priceTierId ? await prisma.priceTier.findUnique({ where: { id: priceTierId } }) : null;
  const provisionalTotal = computeOrderTotal(lines, priceTier?.discountPercent ?? 0);

  const creditCheck = await checkCreditLimit(partnerId, customerId, provisionalTotal);
  if (!creditCheck.ok) {
    const partner = await getPartner(partnerId);
    const customer = await prisma.wholesaleCustomer.findUnique({ where: { id: customerId } });
    if (partner && customer) {
      const message = await wholesaleCreditLimitBreachMessage({
        partnerBusinessName: partner.businessName,
        customerName: customer.name,
        amount: `₹${paiseToRupees(provisionalTotal)}`,
        outstanding: `₹${paiseToRupees(creditCheck.outstanding)}`,
        creditLimit: `₹${paiseToRupees(creditCheck.creditLimit)}`,
      });
      await sendPartnerTelegramAlert(partnerId, "wholesaleCreditLimitBreach", message);
    }
    return { error: creditCheck.error };
  }

  const order = await createWholesaleOrder(partnerId, { customerId, priceTierId, orderDate, lines });

  // "Large order" signal — every order creation, not just ones above some
  // threshold (there is no configurable per-partner order-size threshold
  // yet, see TELEGRAM_ALERT_TYPES's wholesaleLargeOrder doc comment).
  const partner = await getPartner(partnerId);
  if (partner) {
    const message = await wholesaleLargeOrderMessage({
      partnerBusinessName: partner.businessName,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      amount: `₹${paiseToRupees(order.totalAmount)}`,
    });
    await sendPartnerTelegramAlert(partnerId, "wholesaleLargeOrder", message);
  }

  revalidatePath(`/partner/${partnerId}/wholesale-b2b`);
  redirect(`/partner/${partnerId}/wholesale-b2b/${order.id}`);
}

/**
 * Advances (or cancels) an order's status, enforcing the fixed transition
 * set: Pending -> Confirmed -> Dispatched -> Delivered, or Cancelled from
 * any non-final state (see isAllowedStatusTransition). Re-runs the
 * fail-closed credit-limit check on Pending -> Confirmed specifically (per
 * CLAUDE.md's spec: "when creating an order AND when confirming an
 * order") — every other transition doesn't change the customer's
 * outstanding exposure, so it isn't re-checked.
 *
 * No "order overdue" alert is wired here — WholesaleOrder has no due-date
 * column yet; that needs a real schema field added first (see
 * CLAUDE.md/the task brief), not a fabricated threshold.
 */
export async function updateWholesaleOrderStatusAction(
  partnerId: string,
  orderId: string,
  nextStatus: string
): Promise<{ error?: string } | void> {
  partnerId = await requireSessionPartnerId(partnerId);

  const order = await getWholesaleOrder(partnerId, orderId);
  if (!order) return { error: "Order not found." };

  if (!isAllowedStatusTransition(order.status, nextStatus)) {
    return { error: `Cannot move an order from "${order.status}" to "${nextStatus}".` };
  }

  if (order.status === "Pending" && nextStatus === "Confirmed") {
    const creditCheck = await checkCreditLimit(partnerId, order.customerId, order.totalAmount, order.id);
    if (!creditCheck.ok) {
      const partner = await getPartner(partnerId);
      if (partner) {
        const message = await wholesaleCreditLimitBreachMessage({
          partnerBusinessName: partner.businessName,
          customerName: order.customerName,
          amount: `₹${paiseToRupees(order.totalAmount)}`,
          outstanding: `₹${paiseToRupees(creditCheck.outstanding)}`,
          creditLimit: `₹${paiseToRupees(creditCheck.creditLimit)}`,
        });
        await sendPartnerTelegramAlert(partnerId, "wholesaleCreditLimitBreach", message);
      }
      return { error: creditCheck.error };
    }
  }

  await updateWholesaleOrderStatus(partnerId, orderId, nextStatus as WholesaleOrderStatusValue);

  revalidatePath(`/partner/${partnerId}/wholesale-b2b`);
  revalidatePath(`/partner/${partnerId}/wholesale-b2b/${orderId}`);
}

/** Records carrier/tracking details once per order without changing stock. */
export async function createWholesaleDispatchAction(
  partnerId: string,
  orderId: string,
  values: { carrier: string; trackingNumber: string; dispatchedAt: string; notes?: string }
): Promise<{ error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const order = await getWholesaleOrder(partnerId, orderId);
  if (!order) return { error: "Order not found." };
  if (order.status !== "Dispatched" && order.status !== "Delivered") return { error: "Dispatch details are available after the order is dispatched." };
  const carrier = String(values.carrier ?? "").trim();
  const trackingNumber = String(values.trackingNumber ?? "").trim();
  if (!carrier || !trackingNumber) return { error: "Carrier and tracking number are required." };
  const existing = await listBusinessRecords(partnerId, "wholesale-dispatch");
  if (existing.some((row) => String(row.orderId ?? "") === orderId)) return { error: "Dispatch details already exist for this order." };
  const dispatchedAt = new Date(values.dispatchedAt);
  if (Number.isNaN(dispatchedAt.getTime())) return { error: "Enter a valid dispatch date." };
  await createBusinessRecord(partnerId, "wholesale-dispatch", {
    orderId, orderNumber: order.orderNumber, customerName: order.customerName, carrier, trackingNumber,
    dispatchedAt: dispatchedAt.toISOString(), notes: String(values.notes ?? "").trim(),
  });
  revalidatePath(`/partner/${partnerId}/wholesale-b2b/${orderId}`);
  return {};
}

/** Records warehouse pick/pack progress without changing inventory. Stock remains
 * controlled by the existing audited inventory workflows; this record is the
 * operational handoff used to prevent a confirmed order being silently skipped. */
export async function recordWholesaleFulfillmentAction(
  partnerId: string,
  orderId: string,
  stage: "Picked" | "Packed",
): Promise<{ error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const order = await getWholesaleOrder(partnerId, orderId);
  if (!order) return { error: "Order not found." };
  if (!["Confirmed", "Dispatched", "Delivered"].includes(order.status)) return { error: "Only confirmed orders can be picked or packed." };
  const rows = await listBusinessRecords(partnerId, "wholesale-fulfillment");
  const existing = rows.find((row) => String(row.orderId ?? "") === orderId);
  const current = String(existing?.stage ?? "");
  if (stage === "Picked" && current) return { error: "This order already has a fulfilment stage." };
  if (stage === "Packed" && current !== "Picked") return { error: "Mark the order as picked before packing it." };
  const payload = { orderId, orderNumber: order.orderNumber, customerName: order.customerName, stage, recordedAt: new Date().toISOString() };
  if (existing) {
    const { updateBusinessRecord } = await import("@/lib/businessRecords");
    await updateBusinessRecord(partnerId, "wholesale-fulfillment", String(existing.id), payload);
  } else await createBusinessRecord(partnerId, "wholesale-fulfillment", payload);
  revalidatePath(`/partner/${partnerId}/wholesale-b2b/pick-list`);
  revalidatePath(`/partner/${partnerId}/wholesale-b2b/${orderId}`);
  return {};
}
