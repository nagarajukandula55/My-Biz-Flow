/**
 * Prisma-backed data-access layer for the Wholesale B2B module's real
 * tables (WholesaleCustomer, PriceTier, WholesaleOrder, WholesaleOrderLine
 * — see prisma/schema.prisma; these tables are already migrated, see
 * CLAUDE.md's database-safety rules — this file never mutates the schema).
 *
 * Money fields on these Prisma models are paise (int), matching every
 * other real-money column in this schema. The shared UI components
 * (DataTable/RecordForm/RecordDetail "currency" type, via
 * formatCurrencyINR) format a raw number as rupees with no conversion of
 * their own — so every Row/RecordField/FormFieldDef built from these
 * models below converts paise -> rupees for display and rupees -> paise
 * on write, right at this layer's edge.
 */
import { prisma } from "@/lib/prisma";
import { assertPartnerScope } from "@/lib/tenant";
import { getNextNumber } from "@/lib/designer/numbering";
import type { Row } from "@/components/DataTable";

export function paiseToRupees(paise: number): number {
  return Math.round(paise) / 100;
}

export function rupeesToPaise(rupees: number): number {
  return Math.round((Number(rupees) || 0) * 100);
}

/* ------------------------------------------------------------------ *
 * WholesaleCustomer
 * ------------------------------------------------------------------ */

export type WholesaleCustomerRow = {
  id: string;
  partnerId: string;
  name: string;
  contact: string | null;
  gstin: string | null;
  creditLimit: number; // paise
  creditTermDays: number;
  isActive: boolean;
  createdAt: Date;
};

export async function listWholesaleCustomers(partnerId: string): Promise<WholesaleCustomerRow[]> {
  return prisma.wholesaleCustomer.findMany({ where: { partnerId }, orderBy: { createdAt: "desc" } });
}

export async function getWholesaleCustomer(partnerId: string, id: string): Promise<WholesaleCustomerRow | null> {
  const row = await prisma.wholesaleCustomer.findUnique({ where: { id } });
  if (!row) return null;
  assertPartnerScope(partnerId, row.partnerId);
  return row;
}

export async function createWholesaleCustomer(
  partnerId: string,
  input: { name: string; contact?: string; gstin?: string; creditLimit: number; creditTermDays: number; isActive: boolean }
): Promise<WholesaleCustomerRow> {
  return prisma.wholesaleCustomer.create({
    data: {
      partnerId,
      name: input.name,
      contact: input.contact || null,
      gstin: input.gstin || null,
      creditLimit: input.creditLimit,
      creditTermDays: input.creditTermDays,
      isActive: input.isActive,
    },
  });
}

export async function updateWholesaleCustomer(
  partnerId: string,
  id: string,
  input: { name: string; contact?: string; gstin?: string; creditLimit: number; creditTermDays: number; isActive: boolean }
): Promise<void> {
  const existing = await prisma.wholesaleCustomer.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.wholesaleCustomer.update({
    where: { id },
    data: {
      name: input.name,
      contact: input.contact || null,
      gstin: input.gstin || null,
      creditLimit: input.creditLimit,
      creditTermDays: input.creditTermDays,
      isActive: input.isActive,
    },
  });
}

/* ------------------------------------------------------------------ *
 * PriceTier
 * ------------------------------------------------------------------ */

export type PriceTierRow = {
  id: string;
  partnerId: string;
  name: string;
  discountPercent: number;
};

export async function listPriceTiers(partnerId: string): Promise<PriceTierRow[]> {
  return prisma.priceTier.findMany({ where: { partnerId }, orderBy: { name: "asc" } });
}

export async function getPriceTier(partnerId: string, id: string): Promise<PriceTierRow | null> {
  const row = await prisma.priceTier.findUnique({ where: { id } });
  if (!row) return null;
  assertPartnerScope(partnerId, row.partnerId);
  return row;
}

export async function createPriceTier(partnerId: string, input: { name: string; discountPercent: number }): Promise<PriceTierRow> {
  return prisma.priceTier.create({ data: { partnerId, name: input.name, discountPercent: input.discountPercent } });
}

export async function updatePriceTier(partnerId: string, id: string, input: { name: string; discountPercent: number }): Promise<void> {
  const existing = await prisma.priceTier.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.priceTier.update({ where: { id }, data: { name: input.name, discountPercent: input.discountPercent } });
}

/* ------------------------------------------------------------------ *
 * WholesaleOrder / WholesaleOrderLine
 * ------------------------------------------------------------------ */

/** Order lifecycle — see CLAUDE.md's spec: Pending -> Confirmed -> Dispatched
 * -> Delivered, or Cancelled from any non-final state. Delivered/Cancelled
 * are terminal (no further transition allowed). */
export const WHOLESALE_ORDER_STATUSES = ["Pending", "Confirmed", "Dispatched", "Delivered", "Cancelled"] as const;
export type WholesaleOrderStatusValue = (typeof WHOLESALE_ORDER_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<WholesaleOrderStatusValue, WholesaleOrderStatusValue[]> = {
  Pending: ["Confirmed", "Cancelled"],
  Confirmed: ["Dispatched", "Cancelled"],
  Dispatched: ["Delivered", "Cancelled"],
  Delivered: [],
  Cancelled: [],
};

export function isAllowedStatusTransition(from: string, to: string): boolean {
  const allowed = ALLOWED_TRANSITIONS[from as WholesaleOrderStatusValue];
  return Boolean(allowed && allowed.includes(to as WholesaleOrderStatusValue));
}

export type WholesaleOrderLineInput = {
  materialId: string;
  materialLabel: string;
  quantity: number;
  unitPrice: number; // paise, BASE (pre-discount) unit price
};

export type WholesaleOrderRow = {
  id: string;
  partnerId: string;
  customerId: string;
  customerName: string;
  priceTierId: string | null;
  priceTierName: string | null;
  discountPercent: number;
  orderNumber: string;
  status: string;
  orderDate: Date;
  totalAmount: number; // paise, discounted
  createdAt: Date;
  lines: Array<{ id: string; materialId: string; materialLabel: string; quantity: number; unitPrice: number }>;
};

const ORDER_INCLUDE = { customer: true, priceTier: true, lines: true } as const;

function toOrderRow(row: {
  id: string;
  partnerId: string;
  customerId: string;
  priceTierId: string | null;
  orderNumber: string;
  status: string;
  orderDate: Date;
  totalAmount: number;
  createdAt: Date;
  customer: { name: string };
  priceTier: { name: string; discountPercent: number } | null;
  lines: Array<{ id: string; materialId: string; materialLabel: string; quantity: number; unitPrice: number }>;
}): WholesaleOrderRow {
  return {
    id: row.id,
    partnerId: row.partnerId,
    customerId: row.customerId,
    customerName: row.customer.name,
    priceTierId: row.priceTierId,
    priceTierName: row.priceTier?.name ?? null,
    discountPercent: row.priceTier?.discountPercent ?? 0,
    orderNumber: row.orderNumber,
    status: row.status,
    orderDate: row.orderDate,
    totalAmount: row.totalAmount,
    createdAt: row.createdAt,
    lines: row.lines,
  };
}

export async function listWholesaleOrders(partnerId: string): Promise<WholesaleOrderRow[]> {
  const rows = await prisma.wholesaleOrder.findMany({
    where: { partnerId },
    include: ORDER_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toOrderRow);
}

export async function getWholesaleOrder(partnerId: string, id: string): Promise<WholesaleOrderRow | null> {
  const row = await prisma.wholesaleOrder.findUnique({ where: { id }, include: ORDER_INCLUDE });
  if (!row) return null;
  assertPartnerScope(partnerId, row.partnerId);
  return toOrderRow(row);
}

/**
 * Discounted unit price when a price tier applies — the base unitPrice
 * (paise) minus the tier's discountPercent. Pure function so the create
 * form's preview and the server-side totalAmount computation agree exactly
 * (same rule computeOrderLineTotal in the old sample-data file followed).
 */
export function discountedUnitPrice(baseUnitPrice: number, discountPercent: number): number {
  return Math.round(baseUnitPrice * (1 - discountPercent / 100));
}

export function computeOrderTotal(lines: WholesaleOrderLineInput[], discountPercent: number): number {
  return lines.reduce((sum, line) => sum + discountedUnitPrice(line.unitPrice, discountPercent) * line.quantity, 0);
}

/**
 * Sum of totalAmount for this customer's orders NOT in a final "settled"
 * state (Cancelled never counted; Delivered treated as settled/paid-off,
 * same convention the old BusinessRecord version used) — the credit-limit
 * exposure check's own outstanding-balance query. excludeOrderId lets an
 * edit/re-check exclude the order being evaluated from its own running
 * total (e.g. re-checking on Confirm shouldn't double-count the order
 * being confirmed).
 */
export async function customerOutstandingBalance(partnerId: string, customerId: string, excludeOrderId?: string): Promise<number> {
  const orders = await prisma.wholesaleOrder.findMany({
    where: {
      partnerId,
      customerId,
      status: { notIn: ["Cancelled", "Delivered"] },
      ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}),
    },
    select: { totalAmount: true },
  });
  return orders.reduce((sum, o) => sum + o.totalAmount, 0);
}

/**
 * Fail-closed credit-limit check: creditLimit === 0 means "no limit set",
 * never blocks (per CLAUDE.md's explicit exception). Otherwise blocks when
 * (current outstanding + this order's amount) would exceed the limit.
 */
export async function checkCreditLimit(
  partnerId: string,
  customerId: string,
  orderAmount: number,
  excludeOrderId?: string
): Promise<{ ok: true } | { ok: false; error: string; outstanding: number; creditLimit: number }> {
  const customer = await prisma.wholesaleCustomer.findUniqueOrThrow({ where: { id: customerId } });
  assertPartnerScope(partnerId, customer.partnerId);
  if (customer.creditLimit <= 0) return { ok: true };

  const outstanding = await customerOutstandingBalance(partnerId, customerId, excludeOrderId);
  if (outstanding + orderAmount > customer.creditLimit) {
    return {
      ok: false,
      error: `This order (₹${paiseToRupees(orderAmount)}) would push ${customer.name}'s outstanding balance to ₹${paiseToRupees(outstanding + orderAmount)}, over their ₹${paiseToRupees(customer.creditLimit)} credit limit (currently ₹${paiseToRupees(outstanding)} outstanding). Reduce the order, collect payment on existing orders, or raise the credit limit first.`,
      outstanding,
      creditLimit: customer.creditLimit,
    };
  }
  return { ok: true };
}

export async function createWholesaleOrder(
  partnerId: string,
  input: { customerId: string; priceTierId?: string | null; orderDate: Date; lines: WholesaleOrderLineInput[] }
): Promise<WholesaleOrderRow> {
  const priceTier = input.priceTierId ? await prisma.priceTier.findUnique({ where: { id: input.priceTierId } }) : null;
  const discountPercent = priceTier?.discountPercent ?? 0;
  const totalAmount = computeOrderTotal(input.lines, discountPercent);
  const orderNumber = await getNextNumber("wholesale-b2b.order", partnerId, { prefix: "WSO" });

  const row = await prisma.wholesaleOrder.create({
    data: {
      partnerId,
      customerId: input.customerId,
      priceTierId: input.priceTierId || null,
      orderNumber,
      status: "Pending",
      orderDate: input.orderDate,
      totalAmount,
      lines: {
        create: input.lines.map((l) => ({
          materialId: l.materialId,
          materialLabel: l.materialLabel,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
      },
    },
    include: ORDER_INCLUDE,
  });
  return toOrderRow(row);
}

export async function updateWholesaleOrderStatus(partnerId: string, id: string, status: WholesaleOrderStatusValue): Promise<void> {
  const existing = await prisma.wholesaleOrder.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.wholesaleOrder.update({ where: { id }, data: { status } });
}

export function orderToRow(order: WholesaleOrderRow): Row {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    priceTierName: order.priceTierName ?? "—",
    orderDate: order.orderDate.toISOString().slice(0, 10),
    totalAmount: paiseToRupees(order.totalAmount),
    status: order.status,
  };
}
