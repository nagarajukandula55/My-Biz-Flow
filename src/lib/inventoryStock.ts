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
import { listBusinessRecords, updateBusinessRecord, createBusinessRecord } from "@/lib/businessRecords";
import type { Row } from "@/components/DataTable";

/**
 * Material catalog references show up in two shapes across this app: a
 * bare code ("MAT-1001", what Workorder part lines store) and a "CODE —
 * Description" label (what the Stock record's own `materialId` select
 * field stores, since it's built from getBomOptions().map(o => o.label)).
 * Normalizing both sides to just the leading code before comparing is what
 * makes findStockRecord actually match a part line to its stock row.
 */
function materialCode(value: unknown): string {
  return String(value ?? "").split(" — ")[0].trim();
}

/** Splits a "one per line" (or comma-separated) serial-numbers textarea into a clean array — shared by every document (Stock Adjustments, Part Orders, Stock Take) that captures per-unit serials for a Serialized material. */
export function parseSerialNumbers(raw: unknown): string[] {
  return String(raw ?? "")
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Validates a parsed serial-numbers list against the quantity it must cover exactly (one serial per unit, no duplicates) — returns an error string, or null when valid. Shared fail-closed check for every serialized-material transaction. */
export function validateSerialNumbers(serials: string[], quantity: number, materialLabel: string): string | null {
  if (serials.length !== quantity) {
    return `${materialLabel} is a serialized material — enter exactly ${quantity} serial/barcode number${quantity === 1 ? "" : "s"} (one per line), got ${serials.length}.`;
  }
  if (new Set(serials).size !== serials.length) {
    return "Duplicate serial/barcode numbers entered — each unit needs a distinct one.";
  }
  return null;
}

/** A stock row with no `condition` field predates this distinction and is Good stock — every consumer treats a missing value as "Good", never as "unknown"/excluded. */
export type StockCondition = "Good" | "Defective";

function rowCondition(r: Row): StockCondition {
  return r["condition"] === "Defective" ? "Defective" : "Good";
}

/** Finds the stock record for a given material (+ optionally a specific warehouse), scoped to a condition bucket (defaults to "Good", the normal sellable/usable stock). Matches on the record's own `materialId` field (normalized to its bare code), not its `id`. */
export async function findStockRecord(
  partnerId: string,
  materialId: string,
  warehouseName?: string,
  condition: StockCondition = "Good"
): Promise<Row | undefined> {
  const rows = await listBusinessRecords(partnerId, "inventory-stock");
  const code = materialCode(materialId);
  return rows.find(
    (r) =>
      materialCode(r["materialId"]) === code &&
      (!warehouseName || String(r["warehouseName"]) === warehouseName) &&
      rowCondition(r) === condition
  );
}

export async function getQtyOnHand(
  partnerId: string,
  materialId: string,
  warehouseName?: string,
  condition: StockCondition = "Good"
): Promise<number> {
  const stock = await findStockRecord(partnerId, materialId, warehouseName, condition);
  return Number(stock?.["qtyOnHand"] ?? 0);
}

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
    });
    return qtyOnHand;
  }
  const newQty = Math.max(0, Number(existing["qtyOnHand"] ?? 0) + delta);
  const reservedQty = Number(existing["reservedQty"] ?? 0);
  await updateBusinessRecord(partnerId, "inventory-stock", String(existing["id"]), {
    ...existing,
    qtyOnHand: newQty,
    availableQty: Math.max(0, newQty - reservedQty),
  });
  return newQty;
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
  if (qty <= 0) return;
  await adjustStockQty(partnerId, materialId, materialLabel, warehouseName, -qty, "Defective");
  await adjustStockQty(partnerId, materialId, materialLabel, warehouseName, qty, "Good");
}

/**
 * Every material's Available Qty broken down per warehouse it has any
 * stock in — e.g. `{ "MAT-1001": "Central Warehouse — Bengaluru: 42 avail, Local Store — Indiranagar: 3 avail" }`.
 * Used to embed live availability straight into a Material dropdown's
 * option label (Stock Transfers/Return Orders) so a user can see what's
 * actually available before picking a quantity, without a separate
 * client-side lookup.
 */
export async function getAvailabilityByMaterial(partnerId: string): Promise<Map<string, string>> {
  const detail = await getAvailabilityDetailByMaterial(partnerId);
  const result = new Map<string, string>();
  for (const [code, { text }] of detail) result.set(code, text);
  return result;
}

/**
 * Same per-warehouse breakdown as getAvailabilityByMaterial, plus the
 * summed total across every warehouse — used wherever a caller needs to
 * actually compare availability against a required quantity (e.g. the PNA
 * list deciding "Inventory Available" vs "Partially Available" vs "Still
 * Unavailable"), not just show a text hint.
 */
export async function getAvailabilityDetailByMaterial(partnerId: string): Promise<Map<string, { text: string; total: number }>> {
  const rows = await listBusinessRecords(partnerId, "inventory-stock");
  const byMaterial = new Map<string, { entries: string[]; total: number }>();
  for (const r of rows) {
    if (rowCondition(r) !== "Good") continue; // Defective stock isn't usable/sellable — never counts as "available"
    const code = materialCode(r["materialId"]);
    const available = Number(r["availableQty"] ?? r["qtyOnHand"] ?? 0);
    if (available <= 0) continue;
    const existing = byMaterial.get(code) ?? { entries: [], total: 0 };
    existing.entries.push(`${r["warehouseName"]}: ${available} avail`);
    existing.total += available;
    byMaterial.set(code, existing);
  }
  const result = new Map<string, { text: string; total: number }>();
  for (const [code, { entries, total }] of byMaterial) result.set(code, { text: entries.join(", "), total });
  return result;
}

/** Sets a material's on-hand quantity to an exact value (Stock Take reconciliation) rather than adjusting by a delta. */
export async function setStockQty(
  partnerId: string,
  materialId: string,
  materialLabel: string,
  warehouseName: string,
  qty: number
): Promise<void> {
  const existing = await findStockRecord(partnerId, materialId, warehouseName, "Good");
  const clamped = Math.max(0, qty);
  if (!existing) {
    await createBusinessRecord(partnerId, "inventory-stock", {
      materialId: materialLabel || materialId,
      warehouseName,
      condition: "Good",
      qtyOnHand: clamped,
      reservedQty: 0,
      availableQty: clamped,
    });
    return;
  }
  const reservedQty = Number(existing["reservedQty"] ?? 0);
  await updateBusinessRecord(partnerId, "inventory-stock", String(existing["id"]), {
    ...existing,
    qtyOnHand: clamped,
    availableQty: Math.max(0, clamped - reservedQty),
  });
}
