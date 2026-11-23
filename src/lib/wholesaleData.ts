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
  email: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  creditLimit: number; // paise
  creditTermDays: number;
  defaultPriceTierId: string | null;
  referredByCustomerId: string | null;
  referralCode: string | null;
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
  input: { name: string; contact?: string; email?: string; gstin?: string; addressLine?: string; city?: string; state?: string; pincode?: string; creditLimit: number; creditTermDays: number; defaultPriceTierId?: string | null; referredByCustomerId?: string | null; isActive: boolean }
): Promise<WholesaleCustomerRow> {
  if (input.defaultPriceTierId) {
    const tier = await prisma.priceTier.findUnique({ where: { id: input.defaultPriceTierId } });
    if (!tier || tier.partnerId !== partnerId) throw new Error("Selected price tier does not belong to this distributor.");
  }
  if (input.referredByCustomerId) {
    const referrer = await getWholesaleCustomer(partnerId, input.referredByCustomerId);
    if (!referrer?.isActive) throw new Error("Referral must come from an active dealer account.");
  }
  const referralCode = `DLR-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  return prisma.wholesaleCustomer.create({
    data: {
      partnerId,
      name: input.name,
      contact: input.contact || null,
      gstin: input.gstin || null,
      email: input.email || null,
      addressLine: input.addressLine || null,
      city: input.city || null,
      state: input.state || null,
      pincode: input.pincode || null,
      creditLimit: input.creditLimit,
      creditTermDays: input.creditTermDays,
      defaultPriceTierId: input.defaultPriceTierId || null,
      referredByCustomerId: input.referredByCustomerId || null,
      referralCode,
      isActive: input.isActive,
    },
  });
}

export async function updateWholesaleCustomer(
  partnerId: string,
  id: string,
  input: { name: string; contact?: string; email?: string; gstin?: string; addressLine?: string; city?: string; state?: string; pincode?: string; creditLimit: number; creditTermDays: number; defaultPriceTierId?: string | null; isActive: boolean }
): Promise<void> {
  const existing = await prisma.wholesaleCustomer.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  if (input.defaultPriceTierId) {
    const tier = await prisma.priceTier.findUnique({ where: { id: input.defaultPriceTierId } });
    if (!tier || tier.partnerId !== partnerId) throw new Error("Selected price tier does not belong to this distributor.");
  }
  await prisma.wholesaleCustomer.update({
    where: { id },
    data: {
      name: input.name,
      contact: input.contact || null,
      gstin: input.gstin || null,
      email: input.email || null,
      addressLine: input.addressLine || null,
      city: input.city || null,
      state: input.state || null,
      pincode: input.pincode || null,
      creditLimit: input.creditLimit,
      creditTermDays: input.creditTermDays,
      defaultPriceTierId: input.defaultPriceTierId || null,
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

/** Enforced wholesale lifecycle. Statuses are advanced only by the action
 * for the current step; callers never receive a free-form status picker. */
export const WHOLESALE_ORDER_STATUSES = ["Requested", "Processing", "Picking", "Packed", "Shipped", "Delivered", "Received", "Cancelled"] as const;
export type WholesaleOrderStatusValue = (typeof WHOLESALE_ORDER_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<WholesaleOrderStatusValue, WholesaleOrderStatusValue[]> = {
  Requested: ["Processing", "Cancelled"],
  Processing: ["Picking", "Cancelled"],
  Picking: ["Packed", "Cancelled"],
  Packed: ["Shipped", "Cancelled"],
  Shipped: ["Delivered"],
  Delivered: ["Received"],
  Received: [],
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
  productId?: string;
  gstRateBps?: number;
};

export type WholesaleProductRow = {
  id: string; partnerId: string; sku: string; name: string; description: string | null;
  category: string | null; unit: string; listPrice: number; gstRateBps: number;
  minimumQuantity: number; inventoryMaterialId: string | null; barcode: string | null; serialized: boolean; isActive: boolean;
};

export async function listWholesaleProducts(partnerId: string, activeOnly = false): Promise<WholesaleProductRow[]> {
  return prisma.wholesaleProduct.findMany({ where: { partnerId, ...(activeOnly ? { isActive: true } : {}) }, orderBy: [{ isActive: "desc" }, { name: "asc" }] });
}

export async function createWholesaleProduct(partnerId: string, input: Omit<WholesaleProductRow, "id" | "partnerId">): Promise<WholesaleProductRow> {
  return prisma.wholesaleProduct.create({ data: { partnerId, ...input } });
}

export async function updateWholesaleProduct(partnerId: string, id: string, input: Omit<WholesaleProductRow, "id" | "partnerId">): Promise<void> {
  const existing = await prisma.wholesaleProduct.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.wholesaleProduct.update({ where: { id }, data: input });
}

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
  subtotalAmount: number; // paise, discounted before GST
  taxAmount: number; // paise
  createdAt: Date;
  source: string;
  requestedByDealerPartnerId: string | null;
  warehouseId: string | null;
  warehouseName: string | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  receivedAt: Date | null;
  lines: Array<{ id: string; materialId: string; materialLabel: string; quantity: number; allocatedQuantity: number; pickedQuantity: number; shippedQuantity: number; receivedQuantity: number; serialNumbers: unknown; serialLotIds: unknown; unitPrice: number; productId: string | null; gstRateBps: number }>;
  payments: Array<{ id: string; amount: number; method: string; reference: string | null; receivedAt: Date }>;
  events: Array<{ id: string; eventType: string; fromStatus: string | null; toStatus: string | null; actorType: string; actorId: string | null; note: string | null; details: unknown; createdAt: Date }>;
  paidAmount: number;
};

const ORDER_INCLUDE = { customer: true, priceTier: true, lines: true, payments: { orderBy: { receivedAt: "asc" } }, events: { orderBy: { createdAt: "asc" } } } as const;

function toOrderRow(row: {
  id: string;
  partnerId: string;
  customerId: string;
  priceTierId: string | null;
  orderNumber: string;
  status: string;
  orderDate: Date;
  totalAmount: number;
  subtotalAmount: number;
  taxAmount: number;
  createdAt: Date;
  source: string;
  requestedByDealerPartnerId: string | null;
  warehouseId: string | null;
  warehouseName: string | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  receivedAt: Date | null;
  customer: { name: string };
  priceTier: { name: string; discountPercent: number } | null;
  lines: Array<{ id: string; materialId: string; materialLabel: string; quantity: number; allocatedQuantity: number; pickedQuantity: number; shippedQuantity: number; receivedQuantity: number; serialNumbers: unknown; serialLotIds: unknown; unitPrice: number; productId: string | null; gstRateBps: number }>;
  payments: Array<{ id: string; amount: number; method: string; reference: string | null; receivedAt: Date }>;
  events: Array<{ id: string; eventType: string; fromStatus: string | null; toStatus: string | null; actorType: string; actorId: string | null; note: string | null; details: unknown; createdAt: Date }>;
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
    subtotalAmount: row.subtotalAmount,
    taxAmount: row.taxAmount,
    createdAt: row.createdAt,
    source: row.source,
    requestedByDealerPartnerId: row.requestedByDealerPartnerId,
    warehouseId: row.warehouseId,
    warehouseName: row.warehouseName,
    shippedAt: row.shippedAt,
    deliveredAt: row.deliveredAt,
    receivedAt: row.receivedAt,
    lines: row.lines,
    payments: row.payments,
    events: row.events,
    paidAmount: row.payments.reduce((sum, payment) => sum + payment.amount, 0),
  };
}

// TODO: wholesale-b2b/page.tsx renders this full list directly with no
// pagination UI yet. Capped with a safety ceiling (well above realistic
// per-partner order counts today) rather than left fully unbounded, so the
// page can't blow up as a partner's order history grows — follow up with
// real page/pageSize pagination (mirroring listBusinessRecordsPaginated +
// PaginationControls, see billing/page.tsx) before this ceiling is hit.
const WHOLESALE_ORDERS_SAFETY_LIMIT = 500;

export async function listWholesaleOrders(partnerId: string): Promise<WholesaleOrderRow[]> {
  const rows = await prisma.wholesaleOrder.findMany({
    where: { partnerId },
    include: ORDER_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: WHOLESALE_ORDERS_SAFETY_LIMIT,
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
  return calculateWholesaleOrder(lines, discountPercent).totalAmount;
}

export function calculateWholesaleOrder(lines: WholesaleOrderLineInput[], discountPercent: number) {
  const subtotalAmount = lines.reduce((sum, line) => sum + Math.round(discountedUnitPrice(line.unitPrice, discountPercent) * line.quantity), 0);
  const taxAmount = lines.reduce((sum, line) => {
    const lineSubtotal = Math.round(discountedUnitPrice(line.unitPrice, discountPercent) * line.quantity);
    return sum + Math.round(lineSubtotal * (Math.max(0, line.gstRateBps ?? 0) / 10000));
  }, 0);
  return { subtotalAmount, taxAmount, totalAmount: subtotalAmount + taxAmount };
}

/** Resolve every price and GST rate from the distributor-owned catalogue. */
export async function resolveWholesaleOrderLines(partnerId: string, customerId: string, requestedTierId: string | null | undefined, requestedLines: WholesaleOrderLineInput[]) {
  const customer = await getWholesaleCustomer(partnerId, customerId);
  if (!customer || !customer.isActive) throw new Error("Select an active dealer account belonging to this distributor.");
  const tierId = requestedTierId || customer.defaultPriceTierId;
  const tier = tierId ? await prisma.priceTier.findUnique({ where: { id: tierId } }) : null;
  if (tierId && (!tier || tier.partnerId !== partnerId)) throw new Error("Selected price tier does not belong to this distributor.");
  const lines = await Promise.all(requestedLines.map(async (line) => {
    const quantity = Number(line.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100000) throw new Error("Each order quantity must be a positive number within the allowed limit.");
    if (!line.productId) throw new Error("Choose products from the distributor's active catalogue.");
    const product = await prisma.wholesaleProduct.findUnique({ where: { id: line.productId } });
    if (!product || product.partnerId !== partnerId || !product.isActive) throw new Error("One of the selected products is inactive or unavailable.");
    if (quantity < product.minimumQuantity) throw new Error(`${product.name} requires a minimum quantity of ${product.minimumQuantity} ${product.unit}.`);
    return { ...line, materialId: product.id, materialLabel: product.name, quantity, unitPrice: product.listPrice, gstRateBps: product.gstRateBps };
  }));
  return { customer, tier, tierId, lines, pricing: calculateWholesaleOrder(lines, tier?.discountPercent ?? 0) };
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
// Intentionally unbounded (no `take`): this sums EVERY one of a customer's
// still-open orders to gate the credit-limit check in checkCreditLimit().
// Truncating it with a page/take limit would silently understate a
// customer's outstanding balance and could let them exceed their credit
// limit — correctness here requires the full set, not a capped page.
export async function customerOutstandingBalance(partnerId: string, customerId: string, excludeOrderId?: string): Promise<number> {
  const orders = await prisma.wholesaleOrder.findMany({
    where: {
      partnerId,
      customerId,
      status: { not: "Cancelled" },
      ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}),
    },
    select: { id: true, totalAmount: true },
  });
  if (orders.length === 0) return 0;
  const payments = await prisma.wholesalePayment.groupBy({ by: ["orderId"], where: { partnerId, orderId: { in: orders.map((order) => order.id) } }, _sum: { amount: true } });
  const paidByOrder = new Map(payments.map((payment) => [payment.orderId, payment._sum.amount ?? 0]));
  return orders.reduce((sum, order) => sum + Math.max(0, order.totalAmount - (paidByOrder.get(order.id) ?? 0)), 0);
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
  input: { customerId: string; priceTierId?: string | null; orderDate: Date; lines: WholesaleOrderLineInput[]; source?: string; requestedByDealerPartnerId?: string | null }
): Promise<WholesaleOrderRow> {
  const { tier, tierId, lines, pricing } = await resolveWholesaleOrderLines(partnerId, input.customerId, input.priceTierId, input.lines);
  const orderNumber = await getNextNumber("wholesale-b2b.order", partnerId, { prefix: "WSO" });

  const row = await prisma.wholesaleOrder.create({
    data: {
      partnerId,
      customerId: input.customerId,
      priceTierId: tierId || null,
      orderNumber,
      status: "Requested",
      source: input.source ?? "Distributor",
      requestedByDealerPartnerId: input.requestedByDealerPartnerId ?? null,
      orderDate: input.orderDate,
      ...pricing,
      lines: {
        create: lines.map((l) => ({
          materialId: l.materialId,
          materialLabel: l.materialLabel,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          productId: l.productId || null,
          gstRateBps: l.gstRateBps ?? 0,
        })),
      },
      events: { create: { partnerId, eventType: "OrderRequested", toStatus: "Requested", actorType: input.source === "DealerWorkspace" ? "Dealer" : input.source === "DealerPortal" ? "DealerPortal" : "Distributor", actorId: input.requestedByDealerPartnerId ?? null } },
    },
    include: ORDER_INCLUDE,
  });
  return toOrderRow(row);
}

export async function recordWholesalePayment(partnerId: string, orderId: string, input: { amount: number; method: string; reference?: string; receivedAt?: Date }) {
  const order = await prisma.wholesaleOrder.findUnique({ where: { id: orderId }, include: { payments: true } });
  if (!order) throw new Error("Order not found.");
  assertPartnerScope(partnerId, order.partnerId);
  if (order.status === "Cancelled") throw new Error("Payments cannot be recorded against a cancelled order.");
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) throw new Error("Payment amount must be greater than zero.");
  const paid = order.payments.reduce((sum, payment) => sum + payment.amount, 0);
  if (paid + input.amount > order.totalAmount) throw new Error("Payment cannot exceed the remaining order balance.");
  return prisma.wholesalePayment.create({ data: { partnerId, orderId, amount: input.amount, method: input.method, reference: input.reference?.trim() || null, receivedAt: input.receivedAt ?? new Date() } });
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
    subtotalAmount: paiseToRupees(order.subtotalAmount),
    taxAmount: paiseToRupees(order.taxAmount),
    status: order.status,
  };
}
