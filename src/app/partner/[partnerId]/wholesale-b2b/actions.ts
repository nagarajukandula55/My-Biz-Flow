"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { getPartner } from "@/lib/partnerData";
import { sendPartnerTelegramAlert } from "@/lib/telegram";
import { wholesaleLargeOrderMessage, wholesaleCreditLimitBreachMessage } from "@/lib/telegramTemplates";
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
