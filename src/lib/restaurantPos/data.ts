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
import { randomUUID } from "node:crypto";
import {
  computeOrderTotals,
  type OrderLine,
  type RestaurantOrder,
  type RestaurantOrderStatus,
  type MenuItem,
} from "@/lib/sample-data/restaurant-pos";

const MENU_MODULE = "restaurant-menu-items";
const SETTINGS_MODULE = "restaurant-pos-settings";
const SETTINGS_KEY = "operating";
export type RestaurantSettings = { servicePointLabel: string; kitchenEnabled: boolean };

export async function getRestaurantSettings(partnerId: string): Promise<RestaurantSettings> {
  const row = await prisma.businessRecord.findUnique({ where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: SETTINGS_MODULE, recordKey: SETTINGS_KEY } } });
  const raw = row?.data as Partial<RestaurantSettings> | undefined;
  const label = typeof raw?.servicePointLabel === "string" ? raw.servicePointLabel.trim() : "";
  return { servicePointLabel: label.length >= 2 && label.length <= 30 ? label : "Table", kitchenEnabled: raw?.kitchenEnabled !== false };
}

export async function saveRestaurantSettings(partnerId: string, input: Record<string, unknown>): Promise<void> {
  await assertPartnerCanWrite(partnerId);
  const servicePointLabel = String(input.servicePointLabel ?? "").trim().replace(/\s+/g, " ");
  const kitchenValue = String(input.kitchenEnabled ?? "true");
  if (!/^[\p{L}\p{N}][\p{L}\p{N} -]{1,29}$/u.test(servicePointLabel)) throw new Error("Enter a service-point name using 2 to 30 letters, numbers, spaces or hyphens.");
  if (!(["true", "false"].includes(kitchenValue))) throw new Error("Choose whether kitchen tickets are enabled.");
  const data = { servicePointLabel, kitchenEnabled: kitchenValue === "true" };
  await prisma.businessRecord.upsert({
    where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: SETTINGS_MODULE, recordKey: SETTINGS_KEY } },
    create: { partnerId, moduleSlug: SETTINGS_MODULE, recordKey: SETTINGS_KEY, data },
    update: { data },
  });
}

function parseMenuItem(id: string, raw: unknown): MenuItem | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const value = raw as Record<string, unknown>;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const category = value.category;
  const price = Number(value.price);
  const taxRate = Number(value.taxRate);
  if (!name || !["Starters", "Mains", "Beverages", "Dessert"].includes(String(category)) ||
      !Number.isFinite(price) || price < 0 || price > 10000000 ||
      !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) return undefined;
  return { id, name, category: category as MenuItem["category"], price, taxRate };
}

/** Returns partner-owned menu configuration over the built-in starting menu. */
export async function listRestaurantMenuItems(partnerId: string): Promise<MenuItem[]> {
  const records = await prisma.businessRecord.findMany({ where: { partnerId, moduleSlug: MENU_MODULE } });
  const active: MenuItem[] = [];
  for (const record of records) {
    const raw = record.data as Record<string, unknown>;
    if (raw.isActive === false) continue;
    const parsed = parseMenuItem(record.recordKey, raw);
    if (parsed) active.push(parsed);
  }
  return active.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

export async function saveRestaurantMenuItem(partnerId: string, input: Record<string, unknown>): Promise<void> {
  await assertPartnerCanWrite(partnerId);
  const id = String(input.id ?? "").trim() || `MENU-${randomUUID()}`;
  const item = parseMenuItem(id, input);
  if (!item || item.name.length > 100) throw new Error("Enter a valid menu name, category, price and tax rate.");
  const existing = await prisma.businessRecord.findUnique({ where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: MENU_MODULE, recordKey: id } } });
  const data = { ...item, isActive: true };
  if (existing) await prisma.businessRecord.update({ where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: MENU_MODULE, recordKey: id } }, data: { data } });
  else await prisma.businessRecord.create({ data: { partnerId, moduleSlug: MENU_MODULE, recordKey: id, data } });
}

export async function deactivateRestaurantMenuItem(partnerId: string, id: string): Promise<void> {
  await assertPartnerCanWrite(partnerId);
  const existing = await prisma.businessRecord.findUnique({ where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: MENU_MODULE, recordKey: id } } });
  if (existing) {
    await prisma.businessRecord.update({ where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: MENU_MODULE, recordKey: id } }, data: { data: { ...(existing.data as Record<string, unknown>), isActive: false } } });
    return;
  }
}

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

export async function listOrdersForPartner(partnerId: string, page = 1): Promise<{ rows: Row[]; page: number; hasNext: boolean }> {
  const safePage = Number.isSafeInteger(page) && page > 0 && page < 10000 ? page : 1;
  const rows = await prisma.restaurantOrder.findMany({ where: { partnerId }, orderBy: [{ orderTime: "desc" }, { id: "desc" }], skip: (safePage - 1) * 100, take: 101 });
  return { rows: rows.slice(0, 100).map(toRow), page: safePage, hasNext: rows.length > 100 };
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

export async function listTableNumbersForPartner(partnerId: string): Promise<string[]> {
  const existing = await prisma.restaurantTable.findMany({
    where: { partnerId, isActive: true },
    orderBy: { tableNumber: "asc" },
  });
  return existing.map((t) => t.tableNumber);
}

export async function assertRestaurantTableActive(partnerId: string, tableNumber: string): Promise<void> {
  await listTableNumbersForPartner(partnerId);
  const table = await prisma.restaurantTable.findUnique({ where: { partnerId_tableNumber: { partnerId, tableNumber } } });
  if (!table?.isActive) throw new Error("This table is not active on the restaurant floor.");
}

export async function listRestaurantTables(partnerId: string): Promise<{ id: string; tableNumber: string; isActive: boolean }[]> {
  await listTableNumbersForPartner(partnerId);
  return prisma.restaurantTable.findMany({ where: { partnerId }, orderBy: { tableNumber: "asc" } });
}

export async function activateRestaurantTable(partnerId: string, value: unknown): Promise<void> {
  await assertPartnerCanWrite(partnerId);
  const tableNumber = String(value ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9 -]{0,19}$/.test(tableNumber)) throw new Error("Enter a table name using up to 20 letters, numbers, spaces or hyphens.");
  const existing = await prisma.restaurantTable.findUnique({ where: { partnerId_tableNumber: { partnerId, tableNumber } } });
  if (existing) {
    if (!existing.isActive) await prisma.restaurantTable.update({ where: { id: existing.id }, data: { isActive: true } });
    return;
  }
  await prisma.restaurantTable.create({ data: { partnerId, tableNumber } });
}

export async function deactivateRestaurantTable(partnerId: string, id: string): Promise<void> {
  await assertPartnerCanWrite(partnerId);
  const table = await prisma.restaurantTable.findUnique({ where: { id } });
  if (!table) return;
  assertPartnerScope(partnerId, table.partnerId);
  const openOrder = await prisma.restaurantOrder.findFirst({ where: { partnerId, tableNumber: table.tableNumber, status: { in: [...OPEN_STATUSES] } }, select: { id: true } });
  if (openOrder) throw new Error("Close the active order before removing this table from the floor.");
  await prisma.restaurantTable.update({ where: { id }, data: { isActive: false } });
}
