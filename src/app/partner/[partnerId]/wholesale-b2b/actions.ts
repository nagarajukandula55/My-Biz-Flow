"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { getPartner } from "@/lib/partnerData";
import { sendPartnerTelegramAlert } from "@/lib/telegram";
import { wholesaleLargeOrderMessage, wholesaleCreditLimitBreachMessage } from "@/lib/telegramTemplates";
import { prisma } from "@/lib/prisma";
import {
  checkCreditLimit, createWholesaleOrder, getWholesaleOrder, paiseToRupees,
  resolveWholesaleOrderLines, recordWholesalePayment, type WholesaleOrderLineInput,
} from "@/lib/wholesaleData";
import {
  allocateWholesaleStock, cancelWholesaleOrder, confirmWholesalePicking,
  markWholesaleDelivered, packWholesaleOrder, shipWholesaleOrder, startWholesaleProcessing,
} from "@/lib/wholesaleFulfillment";

const refresh = (partnerId: string, orderId: string) => {
  revalidatePath(`/partner/${partnerId}/wholesale-b2b`);
  revalidatePath(`/partner/${partnerId}/wholesale-b2b/${orderId}`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
};

export async function createWholesaleOrderAction(partnerId: string, values: { customerId: string; priceTierId?: string; orderDate: string; lines: WholesaleOrderLineInput[] }): Promise<{ error?: string } | void> {
  partnerId = await requireSessionPartnerId(partnerId);
  const customerId = String(values.customerId ?? "").trim();
  if (!customerId) return { error: "Customer is required." };
  const lines = (values.lines ?? []).filter((line) => line.productId && line.quantity > 0);
  if (!lines.length) return { error: "Add at least one product with a positive quantity." };
  const orderDate = values.orderDate ? new Date(values.orderDate) : new Date();
  let resolved;
  try { resolved = await resolveWholesaleOrderLines(partnerId, customerId, values.priceTierId || null, lines); }
  catch (error) { return { error: error instanceof Error ? error.message : "Could not validate order pricing." }; }
  const credit = await checkCreditLimit(partnerId, customerId, resolved.pricing.totalAmount);
  if (!credit.ok) {
    const [partner, customer] = await Promise.all([getPartner(partnerId), prisma.wholesaleCustomer.findUnique({ where: { id: customerId } })]);
    if (partner && customer) await sendPartnerTelegramAlert(partnerId, "wholesaleCreditLimitBreach", await wholesaleCreditLimitBreachMessage({ partnerBusinessName: partner.businessName, customerName: customer.name, amount: `₹${paiseToRupees(resolved.pricing.totalAmount)}`, outstanding: `₹${paiseToRupees(credit.outstanding)}`, creditLimit: `₹${paiseToRupees(credit.creditLimit)}` }));
    return { error: credit.error };
  }
  let order;
  try { order = await createWholesaleOrder(partnerId, { customerId, priceTierId: values.priceTierId || null, orderDate, lines: resolved.lines, source: "Distributor" }); }
  catch (error) { return { error: error instanceof Error ? error.message : "Could not create the purchase order." }; }
  const partner = await getPartner(partnerId);
  if (partner) await sendPartnerTelegramAlert(partnerId, "wholesaleLargeOrder", await wholesaleLargeOrderMessage({ partnerBusinessName: partner.businessName, orderNumber: order.orderNumber, customerName: order.customerName, amount: `₹${paiseToRupees(order.totalAmount)}` }));
  revalidatePath(`/partner/${partnerId}/wholesale-b2b`);
  redirect(`/partner/${partnerId}/wholesale-b2b/${order.id}`);
}

async function runStep(partnerId: string, orderId: string, work: (actor: { type: "Distributor"; id: string }) => Promise<void>): Promise<{ error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  try { await work({ type: "Distributor", id: partnerId }); refresh(partnerId, orderId); return {}; }
  catch (error) { return { error: error instanceof Error ? error.message : "The order could not be updated." }; }
}

export async function startWholesaleProcessingAction(partnerId: string, orderId: string) {
  return runStep(partnerId, orderId, (actor) => startWholesaleProcessing(partnerId, orderId, actor));
}
export async function allocateWholesaleStockAction(partnerId: string, orderId: string, values: { warehouseId: string; warehouseName: string; lines: Array<{ lineId: string; quantity: number }> }) {
  return runStep(partnerId, orderId, (actor) => allocateWholesaleStock(partnerId, orderId, values, actor));
}
export async function confirmWholesalePickingAction(partnerId: string, orderId: string, lines: Array<{ lineId: string; quantity: number; serialNumbersRaw?: string }>) {
  return runStep(partnerId, orderId, (actor) => confirmWholesalePicking(partnerId, orderId, lines, actor));
}
export async function packWholesaleOrderAction(partnerId: string, orderId: string) {
  return runStep(partnerId, orderId, (actor) => packWholesaleOrder(partnerId, orderId, actor));
}
export async function shipWholesaleOrderAction(partnerId: string, orderId: string, values: { carrier: string; trackingNumber: string; note?: string }) {
  return runStep(partnerId, orderId, (actor) => shipWholesaleOrder(partnerId, orderId, values, actor));
}
export async function markWholesaleDeliveredAction(partnerId: string, orderId: string) {
  return runStep(partnerId, orderId, (actor) => markWholesaleDelivered(partnerId, orderId, actor));
}
export async function cancelWholesaleOrderAction(partnerId: string, orderId: string) {
  return runStep(partnerId, orderId, (actor) => cancelWholesaleOrder(partnerId, orderId, actor));
}

export async function recordWholesalePaymentAction(partnerId: string, orderId: string, values: { amount: number; method: string; reference?: string }): Promise<{ error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const order = await getWholesaleOrder(partnerId, orderId);
  if (!order) return { error: "Order not found." };
  const method = String(values.method ?? "");
  if (!["Cash", "UPI", "Bank transfer", "Cheque", "Other"].includes(method)) return { error: "Select a valid payment method." };
  const amount = Math.round(Number(values.amount) * 100);
  try {
    const payment = await recordWholesalePayment(partnerId, orderId, { amount, method, reference: String(values.reference ?? "").slice(0, 120) });
    if (!payment.replayed) {
      await prisma.wholesaleOrderEvent.create({ data: { partnerId, orderId, eventType: "PaymentRecorded", actorType: "Distributor", actorId: partnerId, details: { paymentId: payment.payment.id, amount, method, reference: values.reference || null } } });
    }
  } catch (error) { return { error: error instanceof Error ? error.message : "Could not record payment." }; }
  refresh(partnerId, orderId);
  return {};
}
