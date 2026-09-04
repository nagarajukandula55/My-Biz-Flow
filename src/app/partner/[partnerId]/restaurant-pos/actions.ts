"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createBusinessRecord, getBusinessRecord, listBusinessRecords, updateBusinessRecord } from "@/lib/businessRecords";
import {
  computeOrderTotals,
  extractOrderFromRecord,
  isOrderOpenForTable,
  restaurantMenuItems,
  type OrderLine,
} from "@/lib/sample-data/restaurant-pos";

/** Finds the currently-open order (if any) occupying a table. */
export async function findOpenOrderForTable(partnerId: string, tableNumber: string) {
  const records = await listBusinessRecords(partnerId, "restaurant-pos");
  const match = records.find((r) => String(r["tableNumber"]) === tableNumber && isOrderOpenForTable((r["status"] as "Open") ?? "Open"));
  return match ? extractOrderFromRecord(match) : null;
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
  const menuItem = restaurantMenuItems.find((m) => m.id === menuItemId);
  if (!menuItem) throw new Error("Unknown menu item");

  let order = await findOpenOrderForTable(partnerId, tableNumber);
  if (!order) {
    const created = await createBusinessRecord(partnerId, "restaurant-pos", {
      tableNumber,
      waiter: waiter || "",
      status: "Open",
      lines: [],
      covers: 1,
      orderTime: new Date().toISOString(),
    });
    order = extractOrderFromRecord(created);
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
  const record = await getBusinessRecord(partnerId, "restaurant-pos", orderId);
  if (!record) return;
  const order = extractOrderFromRecord(record);
  const line = order.lines.find((l) => l.id === lineId);
  if (!line || line.kotSent) return; // KOT-sent lines are locked — remove/re-add instead
  const lines = order.lines.map((l) => (l.id === lineId ? { ...l, qty: Math.max(1, qty) } : l));
  await persistOrderLines(partnerId, orderId, lines);
  revalidatePath(`/partner/${partnerId}/restaurant-pos/tables/${order.tableNumber}`);
}

export async function removeLineAction(partnerId: string, orderId: string, lineId: string): Promise<void> {
  const record = await getBusinessRecord(partnerId, "restaurant-pos", orderId);
  if (!record) return;
  const order = extractOrderFromRecord(record);
  const line = order.lines.find((l) => l.id === lineId);
  if (!line || line.kotSent) return; // can't remove an already-fired KOT line
  const lines = order.lines.filter((l) => l.id !== lineId);
  await persistOrderLines(partnerId, orderId, lines);
  revalidatePath(`/partner/${partnerId}/restaurant-pos/tables/${order.tableNumber}`);
}

/** Marks every not-yet-sent line as sent to the kitchen and flips order status to "In kitchen". */
export async function sendToKitchenAction(partnerId: string, orderId: string): Promise<void> {
  const record = await getBusinessRecord(partnerId, "restaurant-pos", orderId);
  if (!record) return;
  const order = extractOrderFromRecord(record);
  const unsent = order.lines.filter((l) => !l.kotSent);
  if (unsent.length === 0) return;
  const lines = order.lines.map((l) => ({ ...l, kotSent: true }));
  await updateBusinessRecord(partnerId, "restaurant-pos", orderId, {
    ...record,
    lines,
    status: "In kitchen",
    kotSentAt: new Date().toISOString(),
    items: lines.map((l) => `${l.name} x${l.qty}`).join(", "),
  });
  revalidatePath(`/partner/${partnerId}/restaurant-pos/tables/${order.tableNumber}`);
  revalidatePath(`/partner/${partnerId}/restaurant-pos`);
}

export async function markServedAction(partnerId: string, orderId: string): Promise<void> {
  const record = await getBusinessRecord(partnerId, "restaurant-pos", orderId);
  if (!record) return;
  await updateBusinessRecord(partnerId, "restaurant-pos", orderId, { ...record, status: "Served" });
  revalidatePath(`/partner/${partnerId}/restaurant-pos/tables/${String(record["tableNumber"])}`);
  revalidatePath(`/partner/${partnerId}/restaurant-pos`);
}

export async function setCoversAction(partnerId: string, orderId: string, covers: number): Promise<void> {
  const record = await getBusinessRecord(partnerId, "restaurant-pos", orderId);
  if (!record) return;
  await updateBusinessRecord(partnerId, "restaurant-pos", orderId, { ...record, covers: Math.max(1, covers) });
  revalidatePath(`/partner/${partnerId}/restaurant-pos/tables/${String(record["tableNumber"])}`);
}

/**
 * Settles the bill: recomputes totals server-side, creates a real Billing
 * invoice (mirrors POS's completeSaleAction), and frees the table by
 * marking the order Billed. Split-bill support divides the total evenly
 * across `splitCount` covers and creates one invoice per share.
 */
export async function settleBillAction(
  partnerId: string,
  orderId: string,
  input: { tenderMethod: string; splitCount?: number }
): Promise<void> {
  const record = await getBusinessRecord(partnerId, "restaurant-pos", orderId);
  if (!record) throw new Error("Order not found");
  const order = extractOrderFromRecord(record);
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

  await updateBusinessRecord(partnerId, "restaurant-pos", orderId, {
    ...record,
    status: "Billed",
    billedAt: new Date().toISOString(),
    invoiceIds,
    orderTotal: totals.totalAmount,
    ...totals,
  });

  revalidatePath(`/partner/${partnerId}/restaurant-pos`);
  revalidatePath(`/partner/${partnerId}/restaurant-pos/tables`);
  redirect(`/partner/${partnerId}/restaurant-pos/${orderId}`);
}

export async function cancelOrderAction(partnerId: string, orderId: string, reason: string): Promise<void> {
  const record = await getBusinessRecord(partnerId, "restaurant-pos", orderId);
  if (!record) return;
  await updateBusinessRecord(partnerId, "restaurant-pos", orderId, {
    ...record,
    status: "Cancelled",
    cancelReason: reason || "Cancelled by staff",
  });
  revalidatePath(`/partner/${partnerId}/restaurant-pos`);
  revalidatePath(`/partner/${partnerId}/restaurant-pos/tables`);
}

async function persistOrderLines(partnerId: string, orderId: string, lines: OrderLine[]): Promise<void> {
  const record = await getBusinessRecord(partnerId, "restaurant-pos", orderId);
  if (!record) return;
  const totals = computeOrderTotals(lines);
  await updateBusinessRecord(partnerId, "restaurant-pos", orderId, {
    ...record,
    lines,
    ...totals,
    orderTotal: totals.totalAmount,
    items: lines.map((l) => `${l.name} x${l.qty}`).join(", "),
  });
}
