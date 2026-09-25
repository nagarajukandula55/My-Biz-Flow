/**
 * Prisma-backed data-access layer for the Marketplace module's real tables
 * (MarketplaceVendor, MarketplaceListing, MarketplaceOrder — see
 * prisma/schema.prisma; already migrated, see CLAUDE.md's database-safety
 * rules — this file never mutates the schema).
 *
 * Scope (per the audit that authorized this pass): SINGLE-PARTNER only — a
 * partner's own product listings and the orders placed against them. This
 * is NOT a cross-tenant marketplace; a true "browse other partners'
 * listings" discovery experience would need its own design against this
 * app's tenant-isolation convention (src/lib/tenant.ts) and is explicitly
 * out of scope here.
 *
 * Money fields (MarketplaceListing.price, MarketplaceOrder.totalAmount) are
 * paise (int), matching every other real-money column in this schema. The
 * shared UI components (DataTable/RecordForm/RecordDetail "currency" type,
 * via formatCurrencyINR) format a raw number as rupees with no conversion
 * of their own — so every Row/RecordField/FormFieldDef built from these
 * models converts paise -> rupees for display and rupees -> paise on
 * write, right at this layer's edge (same convention as src/lib/wholesaleData.ts).
 */
import { prisma } from "@/lib/prisma";
import { assertPartnerScope } from "@/lib/tenant";

export function paiseToRupees(paise: number): number {
  return Math.round(paise) / 100;
}

export function rupeesToPaise(rupees: number): number {
  return Math.round((Number(rupees) || 0) * 100);
}

/* ------------------------------------------------------------------ *
 * MarketplaceVendor — one settings row per partner (get-or-create, same
 * shape as Inventory's ageing-threshold single-row pattern, but backed by
 * its own real Prisma table rather than a BusinessRecord since this one
 * already has a dedicated migrated model).
 * ------------------------------------------------------------------ */

export type MarketplaceVendorRow = {
  id: string;
  partnerId: string;
  isActive: boolean;
  createdAt: Date;
};

/** Get-or-create: "vendor since" (createdAt) only means anything once a row
 * exists, so the first read of this page for a partner creates it. */
export async function getOrCreateMarketplaceVendor(partnerId: string): Promise<MarketplaceVendorRow> {
  const existing = await prisma.marketplaceVendor.findUnique({ where: { partnerId } });
  if (existing) return existing;
  return prisma.marketplaceVendor.create({ data: { partnerId } });
}

export async function setMarketplaceVendorActive(partnerId: string, isActive: boolean): Promise<void> {
  await getOrCreateMarketplaceVendor(partnerId);
  await prisma.marketplaceVendor.update({ where: { partnerId }, data: { isActive } });
}

/* ------------------------------------------------------------------ *
 * MarketplaceListing
 * ------------------------------------------------------------------ */

export type MarketplaceListingRow = {
  id: string;
  partnerId: string;
  title: string;
  description: string | null;
  price: number; // paise
  stockQuantity: number;
  isActive: boolean;
  category: string | null;
  createdAt: Date;
};

export type MarketplaceListingInput = {
  title: string;
  description?: string;
  price: number; // paise
  stockQuantity: number;
  isActive: boolean;
  category?: string;
};

export async function listMarketplaceListings(partnerId: string): Promise<MarketplaceListingRow[]> {
  return prisma.marketplaceListing.findMany({ where: { partnerId }, orderBy: { createdAt: "desc" } });
}

export async function getMarketplaceListing(partnerId: string, id: string): Promise<MarketplaceListingRow | null> {
  const row = await prisma.marketplaceListing.findUnique({ where: { id } });
  if (!row) return null;
  assertPartnerScope(partnerId, row.partnerId);
  return row;
}

export async function createMarketplaceListing(partnerId: string, input: MarketplaceListingInput): Promise<MarketplaceListingRow> {
  return prisma.marketplaceListing.create({
    data: {
      partnerId,
      title: input.title,
      description: input.description || null,
      price: input.price,
      stockQuantity: input.stockQuantity,
      isActive: input.isActive,
      category: input.category || null,
    },
  });
}

export async function updateMarketplaceListing(partnerId: string, id: string, input: MarketplaceListingInput): Promise<void> {
  const existing = await prisma.marketplaceListing.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.marketplaceListing.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description || null,
      price: input.price,
      stockQuantity: input.stockQuantity,
      isActive: input.isActive,
      category: input.category || null,
    },
  });
}

/* ------------------------------------------------------------------ *
 * MarketplaceOrder
 * ------------------------------------------------------------------ */

export const MARKETPLACE_ORDER_STATUSES = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"] as const;
export type MarketplaceOrderStatusValue = (typeof MARKETPLACE_ORDER_STATUSES)[number];

export type MarketplaceOrderRow = {
  id: string;
  partnerId: string;
  listingId: string;
  listingTitle: string;
  customerName: string;
  customerContact: string | null;
  quantity: number;
  totalAmount: number; // paise
  status: string;
  orderedAt: Date;
};

const ORDER_INCLUDE = { listing: true } as const;

function toOrderRow(row: {
  id: string;
  partnerId: string;
  listingId: string;
  customerName: string;
  customerContact: string | null;
  quantity: number;
  totalAmount: number;
  status: string;
  orderedAt: Date;
  listing: { title: string };
}): MarketplaceOrderRow {
  return {
    id: row.id,
    partnerId: row.partnerId,
    listingId: row.listingId,
    listingTitle: row.listing.title,
    customerName: row.customerName,
    customerContact: row.customerContact,
    quantity: row.quantity,
    totalAmount: row.totalAmount,
    status: row.status,
    orderedAt: row.orderedAt,
  };
}

export async function listMarketplaceOrders(partnerId: string): Promise<MarketplaceOrderRow[]> {
  const rows = await prisma.marketplaceOrder.findMany({
    where: { partnerId },
    include: ORDER_INCLUDE,
    orderBy: { orderedAt: "desc" },
  });
  return rows.map(toOrderRow);
}

export async function getMarketplaceOrder(partnerId: string, id: string): Promise<MarketplaceOrderRow | null> {
  const row = await prisma.marketplaceOrder.findUnique({ where: { id }, include: ORDER_INCLUDE });
  if (!row) return null;
  assertPartnerScope(partnerId, row.partnerId);
  return toOrderRow(row);
}

export type CreateMarketplaceOrderInput = {
  listingId: string;
  customerName: string;
  customerContact?: string;
  quantity: number;
};

/**
 * Creates a new order in "Pending" status. totalAmount is always computed
 * server-side from the listing's own current price x quantity — never
 * trusted from the client. Stock is CHECKED here (fail-closed: insufficient
 * stock blocks the order outright) but deliberately NOT decremented at this
 * point — see updateMarketplaceOrderStatus() below for why decrementing
 * happens on the Confirmed transition instead.
 */
export async function createMarketplaceOrder(
  partnerId: string,
  input: CreateMarketplaceOrderInput
): Promise<{ order: MarketplaceOrderRow } | { error: string }> {
  const listing = await prisma.marketplaceListing.findUnique({ where: { id: input.listingId } });
  if (!listing) return { error: "Listing not found." };
  assertPartnerScope(partnerId, listing.partnerId);

  const quantity = Math.max(1, Math.round(Number(input.quantity) || 0));
  const customerName = input.customerName.trim();
  if (!customerName) return { error: "Customer name is required." };

  if (listing.stockQuantity < quantity) {
    return {
      error: `Insufficient stock for "${listing.title}": ${listing.stockQuantity} available, ${quantity} requested.`,
    };
  }

  const totalAmount = listing.price * quantity; // server-side, never trust a client-submitted total

  const row = await prisma.marketplaceOrder.create({
    data: {
      partnerId,
      listingId: listing.id,
      customerName,
      customerContact: input.customerContact?.trim() || null,
      quantity,
      totalAmount,
      status: "Pending",
    },
    include: ORDER_INCLUDE,
  });
  return { order: toOrderRow(row) };
}

/**
 * Advances an order's status. The Pending -> Confirmed transition is the
 * one meaningful side effect: that is where stockQuantity is actually
 * decremented, NOT at order creation. Design choice, documented here since
 * it's easy to assume the opposite: decrementing on creation would let a
 * merely-placed (Pending, possibly never paid/confirmed) order hold stock
 * hostage against every other buyer indefinitely. Confirmed is the first
 * point the vendor has actually committed to fulfilling the order, so
 * that's where the reservation should happen. The stock check is re-run at
 * that point (fail-closed) in case stock changed since the order was
 * placed — another order confirmed first, a manual listing edit, etc. —
 * and the check + decrement + status update all run inside one Prisma
 * transaction so two concurrent confirmations can't both pass the check
 * and over-sell the same units.
 */
export async function updateMarketplaceOrderStatus(
  partnerId: string,
  id: string,
  status: MarketplaceOrderStatusValue
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await prisma.marketplaceOrder.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);

  if (status === "Confirmed" && existing.status !== "Confirmed") {
    try {
      await prisma.$transaction(async (tx) => {
        const listing = await tx.marketplaceListing.findUniqueOrThrow({ where: { id: existing.listingId } });
        if (listing.stockQuantity < existing.quantity) {
          throw new Error(
            `Insufficient stock for "${listing.title}": ${listing.stockQuantity} available, ${existing.quantity} required to confirm this order.`
          );
        }
        await tx.marketplaceListing.update({
          where: { id: listing.id },
          data: { stockQuantity: { decrement: existing.quantity } },
        });
        await tx.marketplaceOrder.update({ where: { id }, data: { status } });
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Failed to confirm order." };
    }
  }

  await prisma.marketplaceOrder.update({ where: { id }, data: { status } });
  return { ok: true };
}
