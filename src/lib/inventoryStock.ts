import { findStockRecord } from "@/lib/inventoryRead";
import type { StockCondition } from "@/lib/inventoryRead";
export { findStockRecord, getQtyOnHand, getAvailabilityByMaterial, getAvailabilityDetailByMaterial, parseSerialNumbers, validateSerialNumbers, type StockCondition } from "@/lib/inventoryRead";
import { withRecordLock } from "@/lib/withRecordLock";
/**
 * Single source of truth for reading/writing an "inventory-stock"
 * BusinessRecord's on-hand quantity. Fixes a real bug found across every
 * consumer that existed before this file: they all wrote a field called
 * `quantityOnHand`, but the live Stock UI (src/lib/sample-data/warehouse.ts,
 * the only sample-data file the actual Inventory (Stock) pages use) reads
 * and writes `qtyOnHand` — a different field name on the same record. Every
 * previous "deduction" was silently writing to a field nothing displayed,
 * while the real qtyOnHand the UI shows never moved. They also looked stock
 * records up by treating a *material* id as if it were the *stock record's
 * own* id (`stockById.get(line.materialId)` against a map keyed by
 * `r["id"]`, the stock record's id — never the same value), so the lookup
 * itself usually missed. Every module (POS, Manufacturing, Service Centre,
 * Stock Adjustments/Part Orders/Stock Take) should call these instead of
 * touching `inventory-stock` BusinessRecords directly.
 */
import { updateBusinessRecord, createBusinessRecord } from "@/lib/businessRecords";

/**
 * Applies `delta` (positive to add, negative to consume) to a material's
 * on-hand quantity, creating the stock record if none exists yet (for a
 * material never stocked before) or updating the matching one in place.
 * Returns the resulting quantity. Never goes below zero — a negative delta
 * larger than what's on hand floors at 0 (callers that must reject an
 * over-consumption should check `getQtyOnHand` first and refuse before
 * calling this, same fail-closed pattern completeSaleAction already used).
 */
export async function adjustStockQty(
  partnerId: string,
  materialId: string,
  materialLabel: string,
  warehouseName: string,
  delta: number,
  condition: StockCondition = "Good"
): Promise<number> {
  if (!Number.isFinite(delta)) throw new Error("Stock quantity must be a finite number");
  return withRecordLock("inventory-partner", partnerId, () => adjustStockQtyInner(partnerId, materialId, materialLabel, warehouseName, delta, condition));
}

async function adjustStockQtyInner(
  partnerId: string,
  materialId: string,
  materialLabel: string,
  warehouseName: string,
  delta: number,
  condition: StockCondition = "Good"
): Promise<number> {
  const now = new Date().toISOString();
  const existing = await findStockRecord(partnerId, materialId, warehouseName, condition);
  if (!existing) {
    const qtyOnHand = Math.max(0, delta);
    await createBusinessRecord(partnerId, "inventory-stock", {
      // Stored as the "CODE — Description" label, same format every
      // manual/bulk-import Stock row already uses (stockFormFields'
      // materialId select is built from getBomOptions().map(o => o.label))
      // — findStockRecord normalizes both shapes when matching either way.
      materialId: materialLabel || materialId,
      warehouseName,
      condition,
      qtyOnHand,
      reservedQty: 0,
      availableQty: qtyOnHand,
      lastUpdated: now,
      // First time this material/warehouse/condition combo has ever had
      // stock, so it was necessarily just "received" — see the Ageing
      // report (inventory/ageing) for why this only ever moves forward on
      // an INCREASE, never on every mutation.
      lastReceivedAt: now,
    });
    return qtyOnHand;
  }
  const newQty = Math.max(0, Number(existing["qtyOnHand"] ?? 0) + delta);
  const reservedQty = Number(existing["reservedQty"] ?? 0);
  await updateBusinessRecord(partnerId, "inventory-stock", String(existing["id"]), {
    ...existing,
    qtyOnHand: newQty,
    availableQty: Math.max(0, newQty - reservedQty),
    lastUpdated: now,
    // Ageing measures "how long has this stock been sitting since it was
    // last replenished" — selling/consuming it (delta < 0) doesn't make
    // what's LEFT any younger, so only a genuine increase resets the
    // clock. A row from before this field existed has no lastReceivedAt
    // at all; the Ageing report falls back to recordCreatedAt for those.
    ...(delta > 0 ? { lastReceivedAt: now } : {}),
  });
  return newQty;
}

/**
 * Adjusts ONLY `reservedQty` (positive to reserve, negative to release) for a
 * material/warehouse/condition, recomputing `availableQty = qtyOnHand -
 * reservedQty` in the same write — never touches `qtyOnHand` itself. Used to
 * protect live stock while a Stock Take variance is pending its OTP-gated
 * reconcile: reserving `abs(variance)` on create keeps that quantity out of
 * `availableQty` (so it can't be sold/consumed elsewhere) until the count is
 * either applied (setStockQty, reservation released) or the document is
 * cancelled/discarded (reservation also released). Floors at 0 on both ends
 * — a release larger than what's currently reserved (e.g. from a bug or a
 * double-release) never drives reservedQty negative.
 */
export async function adjustReservedQty(
  partnerId: string,
  materialId: string,
  materialLabel: string,
  warehouseName: string,
  delta: number,
  condition: StockCondition = "Good"
): Promise<number> {
  if (!Number.isFinite(delta)) throw new Error("Stock quantity must be a finite number");
  return withRecordLock("inventory-partner", partnerId, () => adjustReservedQtyInner(partnerId, materialId, materialLabel, warehouseName, delta, condition));
}

async function adjustReservedQtyInner(
  partnerId: string,
  materialId: string,
  materialLabel: string,
  warehouseName: string,
  delta: number,
  condition: StockCondition = "Good"
): Promise<number> {
  if (delta === 0) return 0;
  const now = new Date().toISOString();
  const existing = await findStockRecord(partnerId, materialId, warehouseName, condition);
  if (!existing) {
    // No stock record yet to reserve against (e.g. a Stock Take found extra
    // units of a material never stocked before) — still record the
    // reservation so it's released correctly later, with 0 on-hand/available
    // until the real receipt/adjustment happens.
    const reservedQty = Math.max(0, delta);
    await createBusinessRecord(partnerId, "inventory-stock", {
      materialId: materialLabel || materialId,
      warehouseName,
      condition,
      qtyOnHand: 0,
      reservedQty,
      availableQty: 0,
      lastUpdated: now,
    });
    return reservedQty;
  }
  const qtyOnHand = Number(existing["qtyOnHand"] ?? 0);
  const reservedQty = Math.max(0, Number(existing["reservedQty"] ?? 0) + delta);
  await updateBusinessRecord(partnerId, "inventory-stock", String(existing["id"]), {
    ...existing,
    reservedQty,
    availableQty: Math.max(0, qtyOnHand - reservedQty),
    lastUpdated: now,
  });
  return reservedQty;
}

/**
 * Moves `qty` units of a material from the "Good" bucket to "Defective" in
 * one call — the shape every Good-stock deduction that represents a part
 * actually failing (not just being sold/used up) should use, so the failed
 * unit is still visible/countable in the Defective bucket rather than just
 * disappearing from the stock ledger entirely.
 */
export async function moveGoodToDefective(
  partnerId: string,
  materialId: string,
  materialLabel: string,
  warehouseName: string,
  qty: number
): Promise<void> {
  if (!Number.isFinite(qty)) throw new Error("Stock quantity must be a finite number");
  return withRecordLock("inventory-partner", partnerId, () => moveGoodToDefectiveInner(partnerId, materialId, materialLabel, warehouseName, qty));
}

async function moveGoodToDefectiveInner(
  partnerId: string,
  materialId: string,
  materialLabel: string,
  warehouseName: string,
  qty: number
): Promise<void> {
  if (qty <= 0) return;
  await adjustStockQty(partnerId, materialId, materialLabel, warehouseName, -qty, "Good");
  await adjustStockQty(partnerId, materialId, materialLabel, warehouseName, qty, "Defective");
}

/** Reverses moveGoodToDefective — used when a workorder's consumption is reversed (cancelled/reopened) so the phantom Defective unit it generated doesn't linger after the Good unit is restored. */
export async function moveDefectiveToGood(
  partnerId: string,
  materialId: string,
  materialLabel: string,
  warehouseName: string,
  qty: number
): Promise<void> {
  if (!Number.isFinite(qty)) throw new Error("Stock quantity must be a finite number");
  return withRecordLock("inventory-partner", partnerId, () => moveDefectiveToGoodInner(partnerId, materialId, materialLabel, warehouseName, qty));
}

async function moveDefectiveToGoodInner(
  partnerId: string,
  materialId: string,
  materialLabel: string,
  warehouseName: string,
  qty: number
): Promise<void> {
  if (qty <= 0) return;
  await adjustStockQty(partnerId, materialId, materialLabel, warehouseName, -qty, "Defective");
  await adjustStockQty(partnerId, materialId, materialLabel, warehouseName, qty, "Good");
}

/**
 * Sets a material's on-hand quantity to an exact value (Stock Take
 * reconciliation) rather than adjusting by a delta — the ONE place a
 * physical recount can correct EITHER bucket, Good or Defective. This is
 * deliberately not the same thing as a Stock Adjustment: a Stock Take
 * reconciles the system's number to a genuine physical count with its own
 * audit fields (expected/counted/variance/counted by/date), it isn't a free-
 * form "type a reason, change the quantity" adjustment — which is exactly
 * why Defective stock is allowed to be corrected here even though every
 * other manual path (Stock Adjustments, Stock Transfers, the Stock edit
 * page) is deliberately locked to Good-only. A Defective count still can't
 * be freely inflated/deflated outside of an actual counted reconciliation.
 */
export async function setStockQty(
  partnerId: string,
  materialId: string,
  materialLabel: string,
  warehouseName: string,
  qty: number,
  condition: StockCondition = "Good"
): Promise<void> {
  if (!Number.isFinite(qty)) throw new Error("Stock quantity must be a finite number");
  return withRecordLock("inventory-partner", partnerId, () => setStockQtyInner(partnerId, materialId, materialLabel, warehouseName, qty, condition));
}

async function setStockQtyInner(
  partnerId: string,
  materialId: string,
  materialLabel: string,
  warehouseName: string,
  qty: number,
  condition: StockCondition = "Good"
): Promise<void> {
  const now = new Date().toISOString();
  const existing = await findStockRecord(partnerId, materialId, warehouseName, condition);
  const clamped = Math.max(0, qty);
  if (!existing) {
    await createBusinessRecord(partnerId, "inventory-stock", {
      materialId: materialLabel || materialId,
      warehouseName,
      condition,
      qtyOnHand: clamped,
      reservedQty: 0,
      availableQty: clamped,
      lastUpdated: now,
      lastReceivedAt: now,
    });
    return;
  }
  const reservedQty = Number(existing["reservedQty"] ?? 0);
  const priorQty = Number(existing["qtyOnHand"] ?? 0);
  await updateBusinessRecord(partnerId, "inventory-stock", String(existing["id"]), {
    ...existing,
    qtyOnHand: clamped,
    availableQty: Math.max(0, clamped - reservedQty),
    lastUpdated: now,
    // A physical count that comes in HIGHER than the system expected is,
    // in effect, a receipt this app never separately logged — same
    // "only an increase resets the ageing clock" rule adjustStockQty uses.
    ...(clamped > priorQty ? { lastReceivedAt: now } : {}),
  });
}
