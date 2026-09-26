"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertPartnerCanWrite, assertPartnerScope } from "@/lib/tenant";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createBusinessRecord } from "@/lib/businessRecords";
import {
  createOrderRecord,
  findOpenOrderForTable,
  toDomainOrder,
  updateOrderRecord,
} from "@/lib/restaurantPos/data";
import {
  computeOrderTotals,
  restaurantMenuItems,
  type OrderLine,
} from "@/lib/sample-data/restaurant-pos";

export { findOpenOrderForTable };

/**
 * Adds (or increments) a menu item on a table's open order — creates the
 * order if the table currently has no open one. Mirrors PosCheckout's
 * addProduct, but server-side since the cart here is shared table state,
 * not local component state.
 */
export async function addItemToOrderAction(
  partnerId: string,
  tableNumber: string,
  menuItemId: string,
  waiter?: string
): Promise<string> {
  partnerId = await requireSessionPartnerId(partnerId);
  const menuItem = restaurantMenuItems.find((m) => m.id === menuItemId);
  if (!menuItem) throw new Error("Unknown menu item");

  let order = await findOpenOrderForTable(partnerId, tableNumber);
  if (!order) {
    await assertPartnerCanWrite(partnerId);
    const created = await prisma.restaurantOrder.create({
      data: {
        partnerId,
        tableNumber,
        waiter: waiter || null,
        status: "Open",
        lines: [],
        covers: 1,
        orderTime: new Date(),
      },
    });
    order = toDomainOrder(created);
  }

  const existing = order.lines.find((l) => l.menuItemId === menuItemId && !l.kotSent);
  let lines: OrderLine[];
  if (existing) {
    lines = order.lines.map((l) => (l.id === existing.id ? { ...l, qty: l.qty + 1 } : l));
  } else {
    lines = [
      ...order.lines,
      {
        id: `L-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        menuItemId: menuItem.id,
        name: menuItem.name,
        qty: 1,
        unitPrice: menuItem.price,
        taxRate: menuItem.taxRate,
        kotSent: false,
      },
    ];
  }

  await persistOrderLines(partnerId, order.id, lines);
  revalidatePath(`/partner/${partnerId}/restaurant-pos/tables/${tableNumber}`);
  return order.id;
}

export async function updateLineQtyAction(partnerId: string, orderId: string, lineId: string, qty: number): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  const order = await getOwnedOrder(partnerId, orderId);
  if (!order) return;
  const line = order.lines.find((l) => l.id === lineId);
  if (!line || line.kotSent) return; // KOT-sent lines are locked — remove/re-add instead
  const lines = order.lines.map((l) => (l.id === lineId ? { ...l, qty: Math.max(1, qty) } : l));
  await persistOrderLines(partnerId, orderId, lines);
  revalidatePath(`/partner/${partnerId}/restaurant-pos/tables/${order.tableNumber}`);
}

export async function removeLineAction(partnerId: string, orderId: string, lineId: string): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  const order = await getOwnedOrder(partnerId, orderId);
  if (!order) return;
  const line = order.lines.find((l) => l.id === lineId);
  if (!line || line.kotSent) return; // can't remove an already-fired KOT line
  const lines = order.lines.filter((l) => l.id !== lineId);
  await persistOrderLines(partnerId, orderId, lines);
  revalidatePath(`/partner/${partnerId}/restaurant-pos/tables/${order.tableNumber}`);
}

/** Marks every not-yet-sent line as sent to the kitchen and flips order status to "In kitchen". */
export async function sendToKitchenAction(partnerId: string, orderId: string): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  const order = await getOwnedOrder(partnerId, orderId);
  if (!order) return;
  const unsent = order.lines.filter((l) => !l.kotSent);
  if (unsent.length === 0) return;
  const lines = order.lines.map((l) => ({ ...l, kotSent: true }));
  await assertPartnerCanWrite(partnerId);
  await prisma.restaurantOrder.update({
    where: { id: orderId },
    data: { lines: lines as unknown as object, status: "In kitchen", kotSentAt: new Date() },
  });
  revalidatePath(`/partner/${partnerId}/restaurant-pos/tables/${order.tableNumber}`);
  revalidatePath(`/partner/${partnerId}/restaurant-pos`);
}

export async function markServedAction(partnerId: string, orderId: string): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  const order = await getOwnedOrder(partnerId, orderId);
  if (!order) return;
  await assertPartnerCanWrite(partnerId);
  await prisma.restaurantOrder.update({ where: { id: orderId }, data: { status: "Served" } });
  revalidatePath(`/partner/${partnerId}/restaurant-pos/tables/${order.tableNumber}`);
  revalidatePath(`/partner/${partnerId}/restaurant-pos`);
}

export async function setCoversAction(partnerId: string, orderId: string, covers: number): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  const order = await getOwnedOrder(partnerId, orderId);
  if (!order) return;
  await assertPartnerCanWrite(partnerId);
  await prisma.restaurantOrder.update({ where: { id: orderId }, data: { covers: Math.max(1, covers) } });
  revalidatePath(`/partner/${partnerId}/restaurant-pos/tables/${order.tableNumber}`);
}

/**
 * Settles the bill: recomputes totals server-side, creates a real Billing
 * invoice (mirrors POS's completeSaleAction — Billing stays BusinessRecord-
 * backed, untouched here), and frees the table by marking the order
 * Billed. Split-bill support divides the total evenly across
 * `splitCount` covers and creates one invoice per share.
 */
export async function settleBillAction(
  partnerId: string,
  orderId: string,
  input: { tenderMethod: string; splitCount?: number }
): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  const order = await getOwnedOrder(partnerId, orderId);
  if (!order) throw new Error("Order not found");
  if (order.lines.length === 0) throw new Error("No items on this order");
  if (order.status === "Billed" || order.status === "Cancelled") throw new Error("Order is already closed");

  const totals = computeOrderTotals(order.lines);
  const splitCount = Math.max(1, Math.floor(input.splitCount || 1));
  const shareTotal = Math.round((totals.totalAmount / splitCount) * 100) / 100;
  const shareSubtotal = Math.round((totals.subtotal / splitCount) * 100) / 100;
  const shareTax = Math.round((totals.taxAmount / splitCount) * 100) / 100;

  const invoiceIds: string[] = [];
  for (let i = 0; i < splitCount; i++) {
    const invoice = await createBusinessRecord(partnerId, "billing", {
      customer: `${order.tableNumber} — Walk-in Guest${splitCount > 1 ? ` (split ${i + 1}/${splitCount})` : ""}`,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      lineItemsSummary: order.lines.map((l) => `${l.name} x${l.qty}`).join(", "),
      subtotal: shareSubtotal,
      taxAmount: shareTax,
      totalAmount: shareTotal,
      paymentStatus: "Paid",
      paymentMode: input.tenderMethod,
      sourceRestaurantOrderId: order.id,
    });
    invoiceIds.push(String(invoice.id));
  }

  await assertPartnerCanWrite(partnerId);
  await prisma.restaurantOrder.update({
    where: { id: orderId },
    data: {
      status: "Billed",
      billedAt: new Date(),
      invoiceIds: invoiceIds as unknown as object,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
    },
  });

  revalidatePath(`/partner/${partnerId}/restaurant-pos`);
  revalidatePath(`/partner/${partnerId}/restaurant-pos/tables`);
  redirect(`/partner/${partnerId}/restaurant-pos/${orderId}`);
}

export async function cancelOrderAction(partnerId: string, orderId: string, reason: string): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  const order = await getOwnedOrder(partnerId, orderId);
  if (!order) return;
  await assertPartnerCanWrite(partnerId);
  await prisma.restaurantOrder.update({
    where: { id: orderId },
    data: { status: "Cancelled", cancelReason: reason || "Cancelled by staff" },
  });
  revalidatePath(`/partner/${partnerId}/restaurant-pos`);
  revalidatePath(`/partner/${partnerId}/restaurant-pos/tables`);
}

/**
 * Manual "/new" and "/[recordId]/edit" form paths (the historical order
 * log — as distinct from the Table Floor cart flow above). Redirect-on-
 * success mirrors createBusinessRecordAction/updateBusinessRecordAction's
 * convention (?created=1 / ?updated=1 acknowledgment).
 */
export async function createOrderFormAction(partnerId: string, values: Record<string, unknown>) {
  partnerId = await requireSessionPartnerId(partnerId);
  const record = await createOrderRecord(partnerId, values);
  revalidatePath(`/partner/${partnerId}/restaurant-pos`);
  redirect(`/partner/${partnerId}/restaurant-pos/${record.id}?created=1`);
}

export async function updateOrderFormAction(partnerId: string, recordId: string, values: Record<string, unknown>) {
  partnerId = await requireSessionPartnerId(partnerId);
  await updateOrderRecord(partnerId, recordId, values);
  revalidatePath(`/partner/${partnerId}/restaurant-pos`);
  revalidatePath(`/partner/${partnerId}/restaurant-pos/${recordId}`);
  redirect(`/partner/${partnerId}/restaurant-pos/${recordId}?updated=1`);
}

async function getOwnedOrder(partnerId: string, orderId: string) {
  const row = await prisma.restaurantOrder.findUnique({ where: { id: orderId } });
  if (!row) return null;
  assertPartnerScope(partnerId, row.partnerId);
  return toDomainOrder(row);
}

async function persistOrderLines(partnerId: string, orderId: string, lines: OrderLine[]): Promise<void> {
  await assertPartnerCanWrite(partnerId);
  const totals = computeOrderTotals(lines);
  await prisma.restaurantOrder.update({
    where: { id: orderId },
    data: {
      lines: lines as unknown as object,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
    },
  });
}
