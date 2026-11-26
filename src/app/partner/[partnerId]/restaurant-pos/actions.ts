"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertModuleAccess, assertPartnerCanWrite, assertPartnerScope } from "@/lib/tenant";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createBusinessRecord } from "@/lib/businessRecords";
import { sendPartnerTelegramAlert } from "@/lib/telegram";
import { withRecordLock } from "@/lib/withRecordLock";
import {
  findOpenOrderForTable,
  toDomainOrder,
  activateRestaurantTable,
  deactivateRestaurantTable,
  saveRestaurantMenuItem,
  deactivateRestaurantMenuItem,
  listRestaurantMenuItems,
  assertRestaurantTableActive,
  saveRestaurantSettings,
  getRestaurantSettings,
} from "@/lib/restaurantPos/data";
import {
  computeOrderTotals,
  type OrderLine,
} from "@/lib/sample-data/restaurant-pos";

async function notifyRestaurant(partnerId: string, type: import("@/lib/telegram").TelegramAlertType, message: string): Promise<void> {
  try { await sendPartnerTelegramAlert(partnerId, type, message); }
  catch (error) { console.error("[restaurant-telegram] delivery failed", error); }
}

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
  partnerId = await authorizeRestaurant(partnerId);
  await assertRestaurantTableActive(partnerId, tableNumber);
  const menuItem = (await listRestaurantMenuItems(partnerId)).find((m) => m.id === menuItemId);
  if (!menuItem) throw new Error("Unknown menu item");

  const result = await withRecordLock("restaurant-table", `${partnerId}:${tableNumber}`, async () => {
    let order = await findOpenOrderForTable(partnerId, tableNumber);
    const createdOrder = !order;
    if (!order) {
      await assertPartnerCanWrite(partnerId);
      const created = await prisma.restaurantOrder.create({
        data: { partnerId, tableNumber, waiter: waiter || null, status: "Open", lines: [], covers: 1, orderTime: new Date() },
      });
      order = toDomainOrder(created);
    }
    const existing = order.lines.find((line) => line.menuItemId === menuItemId && !line.kotSent);
    const lines: OrderLine[] = existing
      ? order.lines.map((line) => line.id === existing.id ? { ...line, qty: line.qty + 1 } : line)
      : [...order.lines, { id: `L-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, menuItemId: menuItem.id, name: menuItem.name, qty: 1, unitPrice: menuItem.price, taxRate: menuItem.taxRate, kotSent: false }];
    await persistOrderLines(partnerId, order.id, lines);
    return { orderId: order.id, createdOrder };
  });
  if (result.createdOrder) await notifyRestaurant(partnerId, "restaurantOrderOpened", `Restaurant order opened for ${tableNumber}.`);
  revalidatePath(`/partner/${partnerId}/restaurant-pos/tables/${tableNumber}`);
  return result.orderId;
}

/** Replays one device-local draft as an open order after live table/menu checks. */
export async function syncOfflineRestaurantOrderAction(
  partnerId: string,
  draft: { id: string; payload: Record<string, unknown> }
): Promise<{ orderId: string }> {
  partnerId = await authorizeRestaurant(partnerId);
  if (!/^[0-9a-f-]{36}$/i.test(draft.id)) throw new Error("Invalid offline draft identifier.");
  const payload = draft.payload ?? {};
  if (payload.partnerId !== partnerId) throw new Error("This draft belongs to a different business account.");
  const tableNumber = String(payload.tableNumber ?? "").trim().toUpperCase();
  const covers = Number(payload.covers ?? 1);
  if (!Number.isInteger(covers) || covers < 1 || covers > 100) throw new Error("The saved cover count is invalid.");
  const rawLines = payload.lines;
  if (!Array.isArray(rawLines) || rawLines.length < 1 || rawLines.length > 100) throw new Error("The draft must contain 1 to 100 order lines.");

  const result = await withRecordLock("restaurant-table", `${partnerId}:${tableNumber}`, async () => {
    const prior = await prisma.restaurantOrder.findUnique({ where: { id: draft.id } });
    if (prior) {
      assertPartnerScope(partnerId, prior.partnerId);
      if (prior.tableNumber !== tableNumber) throw new Error("This draft identifier is already used by another order.");
      return { orderId: prior.id, created: false };
    }
    await assertRestaurantTableActive(partnerId, tableNumber);
    if (await findOpenOrderForTable(partnerId, tableNumber)) throw new Error(`Order location ${tableNumber} is already occupied. Review this draft and choose another location.`);
    await assertPartnerCanWrite(partnerId);
    const menu = new Map((await listRestaurantMenuItems(partnerId)).map(item => [item.id, item]));
    const lines: OrderLine[] = rawLines.map((raw) => {
      if (!raw || typeof raw !== "object") throw new Error("The saved order contains an invalid line.");
      const line = raw as Record<string, unknown>, item = menu.get(String(line.menuItemId ?? ""));
      const qty = Number(line.qty);
      if (!item || !Number.isInteger(qty) || qty < 1 || qty > 1000) throw new Error("A saved menu item is no longer available or its quantity is invalid. Update the draft online.");
      if (Number(line.unitPrice) !== item.price || Number(line.taxRate) !== item.taxRate) throw new Error(`The price or tax for ${item.name} changed after this draft was saved. Review and recreate it using current menu prices.`);
      return { id: `L-${randomUUID()}`, menuItemId: item.id, name: item.name, qty, unitPrice: item.price, taxRate: item.taxRate, kotSent: false };
    });
    const totals = computeOrderTotals(lines);
    await prisma.restaurantOrder.create({ data: {
      id: draft.id, partnerId, tableNumber, waiter: null, status: "Open", lines: lines as unknown as object,
      covers, subtotal: totals.subtotal, taxAmount: totals.taxAmount, totalAmount: totals.totalAmount, orderTime: new Date(),
    } });
    return { orderId: draft.id, created: true };
  });
  if (result.created) await notifyRestaurant(partnerId, "restaurantOrderOpened", `Restaurant offline draft synced as order ${result.orderId} for ${tableNumber}.`);
  revalidatePath(`/partner/${partnerId}/restaurant-pos/tables`);
  revalidatePath(`/partner/${partnerId}/restaurant-pos/tables/${encodeURIComponent(tableNumber)}`);
  revalidatePath(`/partner/${partnerId}/restaurant-pos`);
  return { orderId: result.orderId };
}

export async function updateLineQtyAction(partnerId: string, orderId: string, lineId: string, qty: number): Promise<void> {
  partnerId = await authorizeRestaurant(partnerId);
  if (!Number.isInteger(qty) || qty < 1 || qty > 1000) throw new Error("Quantity must be a whole number from 1 to 1,000.");
  const tableNumber = await withRecordLock("restaurant-order", `${partnerId}:${orderId}`, async () => {
    const order = await getOwnedOrder(partnerId, orderId);
    if (!order) return null;
    if (["Billed", "Cancelled"].includes(order.status)) throw new Error("Closed orders cannot be changed.");
    const line = order.lines.find((item) => item.id === lineId);
    if (!line || line.kotSent) return order.tableNumber;
    await persistOrderLines(partnerId, orderId, order.lines.map((item) => item.id === lineId ? { ...item, qty } : item));
    return order.tableNumber;
  });
  if (tableNumber) revalidatePath(`/partner/${partnerId}/restaurant-pos/tables/${tableNumber}`);
}

export async function removeLineAction(partnerId: string, orderId: string, lineId: string): Promise<void> {
  partnerId = await authorizeRestaurant(partnerId);
  const tableNumber = await withRecordLock("restaurant-order", `${partnerId}:${orderId}`, async () => {
    const order = await getOwnedOrder(partnerId, orderId);
    if (!order) return null;
    if (["Billed", "Cancelled"].includes(order.status)) throw new Error("Closed orders cannot be changed.");
    const line = order.lines.find((item) => item.id === lineId);
    if (!line || line.kotSent) return order.tableNumber;
    await persistOrderLines(partnerId, orderId, order.lines.filter((item) => item.id !== lineId));
    return order.tableNumber;
  });
  if (tableNumber) revalidatePath(`/partner/${partnerId}/restaurant-pos/tables/${tableNumber}`);
}

/** Marks every not-yet-sent line as sent to the kitchen and flips order status to "In kitchen". */
export async function sendToKitchenAction(partnerId: string, orderId: string): Promise<void> {
  partnerId = await authorizeRestaurant(partnerId);
  if (!(await getRestaurantSettings(partnerId)).kitchenEnabled) throw new Error("Kitchen tickets are disabled for this restaurant. Turn them on in Restaurant setup.");
  const tableNumber = await withRecordLock("restaurant-order", `${partnerId}:${orderId}`, async () => {
    const order = await getOwnedOrder(partnerId, orderId);
    if (!order) return null;
    if (["Billed", "Cancelled"].includes(order.status)) throw new Error("Closed orders cannot be sent to the kitchen.");
    if (!order.lines.some((line) => !line.kotSent)) return order.tableNumber;
    await assertPartnerCanWrite(partnerId);
    await prisma.restaurantOrder.update({ where: { id: orderId }, data: { lines: order.lines.map(line => ({ ...line, kotSent: true })) as unknown as object, status: "In kitchen", kotSentAt: new Date() } });
    return order.tableNumber;
  });
  if (!tableNumber) return;
  await notifyRestaurant(partnerId, "restaurantKitchenTicketSent", `Kitchen ticket sent for order ${orderId} at ${tableNumber}.`);
  revalidatePath(`/partner/${partnerId}/restaurant-pos/tables/${tableNumber}`);
  revalidatePath(`/partner/${partnerId}/restaurant-pos/kitchen`);
  revalidatePath(`/partner/${partnerId}/restaurant-pos`);
}

export async function markServedAction(partnerId: string, orderId: string): Promise<void> {
  partnerId = await authorizeRestaurant(partnerId);
  if (!(await getRestaurantSettings(partnerId)).kitchenEnabled) throw new Error("Kitchen tickets are disabled for this restaurant.");
  const tableNumber = await withRecordLock("restaurant-order", `${partnerId}:${orderId}`, async () => {
    const order = await getOwnedOrder(partnerId, orderId);
    if (!order) return null;
    if (order.status !== "In kitchen" || order.lines.length === 0 || order.lines.some(line => !line.kotSent)) throw new Error("Send all order items to the kitchen before marking the order served.");
    await assertPartnerCanWrite(partnerId);
    await prisma.restaurantOrder.update({ where: { id: orderId }, data: { status: "Served" } });
    return order.tableNumber;
  });
  if (tableNumber) revalidatePath(`/partner/${partnerId}/restaurant-pos/tables/${tableNumber}`);
  revalidatePath(`/partner/${partnerId}/restaurant-pos/kitchen`);
  revalidatePath(`/partner/${partnerId}/restaurant-pos`);
}

export async function setCoversAction(partnerId: string, orderId: string, covers: number): Promise<void> {
  partnerId = await authorizeRestaurant(partnerId);
  if (!Number.isInteger(covers) || covers < 1 || covers > 100) throw new Error("Covers must be a whole number from 1 to 100.");
  const tableNumber = await withRecordLock("restaurant-order", `${partnerId}:${orderId}`, async () => {
    const order = await getOwnedOrder(partnerId, orderId);
    if (!order) return null;
    if (["Billed", "Cancelled"].includes(order.status)) throw new Error("Closed orders cannot be changed.");
    await assertPartnerCanWrite(partnerId);
    await prisma.restaurantOrder.update({ where: { id: orderId }, data: { covers } });
    return order.tableNumber;
  });
  if (tableNumber) revalidatePath(`/partner/${partnerId}/restaurant-pos/tables/${tableNumber}`);
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
  input: { tenderMethod: string; splitCount?: number; invoiceType: "GST" | "Non-GST" }
): Promise<void> {
  partnerId = await authorizeRestaurant(partnerId);
  const tableNumber = await withRecordLock("restaurant-order", `${partnerId}:${orderId}`, async () => {
    const order = await getOwnedOrder(partnerId, orderId);
    if (!order) throw new Error("Order not found");
    if (order.lines.length === 0) throw new Error("No items on this order");
    if (order.status === "Billed" || order.status === "Cancelled") throw new Error("Order is already closed");
    const tenderMethods = ["Cash", "UPI", "Card", "Bank transfer", "Wallet", "Other"];
    if (!tenderMethods.includes(input.tenderMethod)) throw new Error("Select a supported payment method.");
    if (!["GST", "Non-GST"].includes(input.invoiceType)) throw new Error("Select GST or Non-GST for this bill.");
    const partner = await (await import("@/lib/partnerData")).getPartner(partnerId);
    if (input.invoiceType === "GST" && !partner?.gstin?.trim()) throw new Error("This business has no GSTIN. Issue a Non-GST bill.");
    const orderTotals = computeOrderTotals(order.lines);
    const totals = input.invoiceType === "GST" ? orderTotals : { ...orderTotals, taxAmount: 0, totalAmount: orderTotals.subtotal };
    const splitCount = input.splitCount ?? 1;
    if (!Number.isInteger(splitCount) || splitCount < 1 || splitCount > Math.min(order.covers, 100)) throw new Error("Split bills must be between 1 and the number of covers.");
    const splitCents = (amount: number) => {
      const cents = Math.round(amount * 100), base = Math.floor(cents / splitCount), extra = cents % splitCount;
      return Array.from({ length: splitCount }, (_, index) => base + (index < extra ? 1 : 0));
    };
    const subtotals = splitCents(totals.subtotal), taxes = splitCents(totals.taxAmount);
    const invoiceIds: string[] = [];
    for (let i = 0; i < splitCount; i++) {
      const shareSubtotal = subtotals[i] / 100, shareTax = taxes[i] / 100;
      const invoice = await createBusinessRecord(partnerId, "billing", {
        customer: `${order.tableNumber} - Walk-in Guest${splitCount > 1 ? ` (split ${i + 1}/${splitCount})` : ""}`,
        issueDate: new Date().toISOString().slice(0, 10), dueDate: new Date().toISOString().slice(0, 10),
        lineItemsSummary: order.lines.map((line) => `${line.name} x${line.qty}`).join(", "),
        subtotal: shareSubtotal, taxAmount: shareTax, totalAmount: shareSubtotal + shareTax,
        paymentStatus: "Paid", amountPaid: shareSubtotal + shareTax, amountDue: 0,
        paymentMode: input.tenderMethod, invoiceType: input.invoiceType, sourceRestaurantOrderId: order.id,
        ...(splitCount === 1 ? { items: order.lines.map(line => ({ description: line.name, quantity: line.qty, unit: "portion", unitPrice: line.unitPrice, taxRate: input.invoiceType === "GST" ? line.taxRate : 0, priceMode: "excl" as const })) } : {}),
      });
      invoiceIds.push(String(invoice.id));
    }
    await assertPartnerCanWrite(partnerId);
    await prisma.restaurantOrder.update({ where: { id: orderId }, data: {
      status: "Billed", billedAt: new Date(), invoiceIds: invoiceIds as unknown as object,
      lines: order.lines.map(line => ({ ...line, billedTaxRate: input.invoiceType === "GST" ? line.taxRate : 0 })) as unknown as object,
      subtotal: totals.subtotal, taxAmount: totals.taxAmount, totalAmount: totals.totalAmount,
    } });
    return order.tableNumber;
  });

  revalidatePath(`/partner/${partnerId}/restaurant-pos`);
  await notifyRestaurant(partnerId, "restaurantOrderBilled", `Restaurant order ${orderId} at ${tableNumber} was billed. Invoice type: ${input.invoiceType}.`);
  revalidatePath(`/partner/${partnerId}/restaurant-pos/tables`);
  revalidatePath(`/partner/${partnerId}/restaurant-pos/tables/${tableNumber}`);
  redirect(`/partner/${partnerId}/restaurant-pos/${orderId}`);
}

export async function cancelOrderAction(partnerId: string, orderId: string, reason: string): Promise<void> {
  partnerId = await authorizeRestaurant(partnerId);
  const tableNumber = await withRecordLock("restaurant-order", `${partnerId}:${orderId}`, async () => {
    const order = await getOwnedOrder(partnerId, orderId);
    if (!order) return null;
    if (["Billed", "Cancelled"].includes(order.status)) throw new Error("Closed orders cannot be cancelled again.");
    if (reason.trim().length > 500) throw new Error("Cancellation reason must be 500 characters or fewer.");
    await assertPartnerCanWrite(partnerId);
    await prisma.restaurantOrder.update({ where: { id: orderId }, data: { status: "Cancelled", cancelReason: reason.trim() || "Cancelled by staff" } });
    return order.tableNumber;
  });
  if (!tableNumber) return;
  await notifyRestaurant(partnerId, "restaurantOrderCancelled", `Restaurant order ${orderId} at ${tableNumber} was cancelled: ${reason.trim() || "Cancelled by staff"}.`);
  revalidatePath(`/partner/${partnerId}/restaurant-pos`);
  revalidatePath(`/partner/${partnerId}/restaurant-pos/tables`);
  revalidatePath(`/partner/${partnerId}/restaurant-pos/tables/${tableNumber}`);
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

async function authorizeRestaurant(partnerId: string): Promise<string> {
  const scopedPartnerId = await requireSessionPartnerId(partnerId);
  await assertModuleAccess(scopedPartnerId, "restaurant-pos");
  return scopedPartnerId;
}

export async function saveRestaurantMenuItemAction(partnerId: string, values: Record<string, unknown>) {
  partnerId = await authorizeRestaurant(partnerId);
  await saveRestaurantMenuItem(partnerId, values);
  revalidatePath(`/partner/${partnerId}/restaurant-pos/menu`);
  redirect(`/partner/${partnerId}/restaurant-pos/menu?saved=1`);
}

export async function deactivateRestaurantMenuItemAction(partnerId: string, id: string) {
  partnerId = await authorizeRestaurant(partnerId);
  await deactivateRestaurantMenuItem(partnerId, id);
  revalidatePath(`/partner/${partnerId}/restaurant-pos/menu`);
  redirect(`/partner/${partnerId}/restaurant-pos/menu?removed=1`);
}

export async function updateRestaurantMenuItemAction(partnerId: string, id: string, values: Record<string, unknown>) {
  partnerId = await authorizeRestaurant(partnerId);
  await saveRestaurantMenuItem(partnerId, { ...values, id });
  revalidatePath(`/partner/${partnerId}/restaurant-pos/menu`);
  revalidatePath(`/partner/${partnerId}/restaurant-pos/tables`);
  redirect(`/partner/${partnerId}/restaurant-pos/menu?saved=1`);
}

export async function activateRestaurantTableAction(partnerId: string, values: Record<string, unknown>) {
  partnerId = await authorizeRestaurant(partnerId);
  await activateRestaurantTable(partnerId, values.tableNumber);
  revalidatePath(`/partner/${partnerId}/restaurant-pos/tables`);
  redirect(`/partner/${partnerId}/restaurant-pos/tables?tableSaved=1`);
}

export async function restoreRestaurantTableAction(partnerId: string, tableNumber: string) {
  partnerId = await authorizeRestaurant(partnerId);
  await activateRestaurantTable(partnerId, tableNumber);
  revalidatePath(`/partner/${partnerId}/restaurant-pos/tables`);
  redirect(`/partner/${partnerId}/restaurant-pos/tables?tableSaved=1`);
}

export async function deactivateRestaurantTableAction(partnerId: string, id: string) {
  partnerId = await authorizeRestaurant(partnerId);
  await deactivateRestaurantTable(partnerId, id);
  revalidatePath(`/partner/${partnerId}/restaurant-pos/tables`);
  redirect(`/partner/${partnerId}/restaurant-pos/tables?tableRemoved=1`);
}

export async function saveRestaurantSettingsAction(partnerId: string, values: Record<string, unknown>) {
  partnerId = await authorizeRestaurant(partnerId);
  await saveRestaurantSettings(partnerId, values);
  revalidatePath(`/partner/${partnerId}/restaurant-pos`);
  revalidatePath(`/partner/${partnerId}/restaurant-pos/tables`);
  revalidatePath(`/partner/${partnerId}/restaurant-pos/kitchen`);
  redirect(`/partner/${partnerId}/restaurant-pos/settings?saved=1`);
}
