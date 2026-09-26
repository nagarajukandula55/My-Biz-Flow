/**
 * Prisma-backed data layer for the restaurant-pos module — RestaurantTable
 * + RestaurantOrder (see prisma/schema.prisma, "2026-09-25, second pass").
 * Replaces the BusinessRecord-backed store this module used previously.
 * Table/order shape and UI behavior are unchanged — only the storage.
 */
import type { RestaurantOrder as PrismaRestaurantOrder } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertPartnerCanWrite, assertPartnerScope } from "@/lib/tenant";
import type { Row } from "@/components/DataTable";
import {
  computeOrderTotals,
  type OrderLine,
  type RestaurantOrder,
  type RestaurantOrderStatus,
} from "@/lib/sample-data/restaurant-pos";

/** Statuses that still "occupy" a table — mirrors isOrderOpenForTable. */
const OPEN_STATUSES = ["Open", "In kitchen", "Served"] as const;

export function toDomainOrder(o: PrismaRestaurantOrder): RestaurantOrder {
  const lines = ((o.lines as unknown) as OrderLine[]) ?? [];
  const totals = computeOrderTotals(lines);
  return {
    id: o.id,
    tableNumber: o.tableNumber,
    waiter: o.waiter ?? undefined,
    lines,
    covers: o.covers,
    status: o.status as RestaurantOrderStatus,
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    totalAmount: totals.totalAmount,
    orderTime: o.orderTime.toISOString(),
    kotSentAt: o.kotSentAt?.toISOString(),
    billedAt: o.billedAt?.toISOString(),
    cancelReason: o.cancelReason ?? undefined,
    invoiceIds: ((o.invoiceIds as unknown) as string[]) ?? [],
  };
}

/** Row-shaped projection for the DataTable/RecordDetail/RecordForm components, which speak the generic BusinessRecord Row vocabulary. */
function toRow(o: PrismaRestaurantOrder): Row {
  const order = toDomainOrder(o);
  return {
    id: order.id,
    tableNumber: order.tableNumber,
    waiter: order.waiter ?? "",
    items: order.lines.map((l) => `${l.name} x${l.qty}`).join(", "),
    orderTotal: order.totalAmount,
    status: order.status,
    orderTime: order.orderTime,
    lines: order.lines,
    covers: order.covers,
    subtotal: order.subtotal,
    taxAmount: order.taxAmount,
    totalAmount: order.totalAmount,
    kotSentAt: order.kotSentAt,
    billedAt: order.billedAt,
    cancelReason: order.cancelReason,
    invoiceIds: order.invoiceIds,
  };
}

export async function listOrdersForPartner(partnerId: string): Promise<Row[]> {
  const rows = await prisma.restaurantOrder.findMany({ where: { partnerId }, orderBy: { orderTime: "desc" } });
  return rows.map(toRow);
}

export async function listOpenOrdersForPartner(partnerId: string): Promise<RestaurantOrder[]> {
  const rows = await prisma.restaurantOrder.findMany({
    where: { partnerId, status: { in: [...OPEN_STATUSES] } },
    orderBy: { orderTime: "desc" },
  });
  return rows.map(toDomainOrder);
}

export async function getOrderRow(partnerId: string, id: string): Promise<Row | undefined> {
  const row = await prisma.restaurantOrder.findUnique({ where: { id } });
  if (!row) return undefined;
  assertPartnerScope(partnerId, row.partnerId);
  return toRow(row);
}

export async function getOrderDomain(partnerId: string, id: string): Promise<RestaurantOrder | undefined> {
  const row = await prisma.restaurantOrder.findUnique({ where: { id } });
  if (!row) return undefined;
  assertPartnerScope(partnerId, row.partnerId);
  return toDomainOrder(row);
}

/** Finds the currently-open order (if any) occupying a table. */
export async function findOpenOrderForTable(partnerId: string, tableNumber: string): Promise<RestaurantOrder | null> {
  const row = await prisma.restaurantOrder.findFirst({
    where: { partnerId, tableNumber, status: { in: [...OPEN_STATUSES] } },
    orderBy: { orderTime: "desc" },
  });
  return row ? toDomainOrder(row) : null;
}

/**
 * Manual creation path (the historical-order-log "/new" form). The
 * RestaurantOrder table has no free-text "items"/"courseStage" columns —
 * this pass keeps those fields on the form for continuity but only
 * persists the columns that actually exist on the model (table, waiter,
 * status, total, time). Lines are empty until items are added from the
 * Table Floor cart.
 */
export async function createOrderRecord(partnerId: string, values: Record<string, unknown>): Promise<Row> {
  await assertPartnerCanWrite(partnerId);
  const row = await prisma.restaurantOrder.create({
    data: {
      partnerId,
      tableNumber: String(values["tableNumber"] ?? "").trim() || "T-01",
      waiter: values["waiter"] ? String(values["waiter"]) : null,
      status: (values["status"] as string) || "Open",
      lines: [],
      covers: 1,
      totalAmount: Number(values["orderTotal"] ?? 0),
      orderTime: values["orderTime"] ? new Date(String(values["orderTime"])) : new Date(),
    },
  });
  return toRow(row);
}

export async function updateOrderRecord(partnerId: string, id: string, values: Record<string, unknown>): Promise<void> {
  await assertPartnerCanWrite(partnerId);
  const existing = await prisma.restaurantOrder.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.restaurantOrder.update({
    where: { id },
    data: {
      tableNumber: values["tableNumber"] !== undefined ? String(values["tableNumber"]) : undefined,
      waiter: values["waiter"] !== undefined ? String(values["waiter"]) : undefined,
      status: values["status"] !== undefined ? String(values["status"]) : undefined,
    },
  });
}

// ---------------------------------------------------------------------
// Table floor
// ---------------------------------------------------------------------

/** Default floor plan, seeded once per partner on first access (used to be a static, shared list — now one row per partner per table). */
const DEFAULT_TABLE_NUMBERS = [
  "T-01", "T-02", "T-03", "T-04", "T-05", "T-06",
  "T-07", "T-08", "T-09", "T-10", "T-11", "T-12",
];

export async function listTableNumbersForPartner(partnerId: string): Promise<string[]> {
  const existing = await prisma.restaurantTable.findMany({
    where: { partnerId, isActive: true },
    orderBy: { tableNumber: "asc" },
  });
  if (existing.length > 0) return existing.map((t) => t.tableNumber);

  // First-ever visit for this partner: seed the default floor plan.
  await prisma.restaurantTable.createMany({
    data: DEFAULT_TABLE_NUMBERS.map((tableNumber) => ({ partnerId, tableNumber })),
    skipDuplicates: true,
  });
  return DEFAULT_TABLE_NUMBERS;
}
