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

/** Finds the stock record for a given material (+ optionally a specific warehouse). Matches on the record's own `materialId` field (normalized to its bare code), not its `id`. */
export async function findStockRecord(
  partnerId: string,
  materialId: string,
  warehouseName?: string
): Promise<Row | undefined> {
  const rows = await listBusinessRecords(partnerId, "inventory-stock");
  const code = materialCode(materialId);
  return rows.find(
    (r) => materialCode(r["materialId"]) === code && (!warehouseName || String(r["warehouseName"]) === warehouseName)
  );
}

export async function getQtyOnHand(partnerId: string, materialId: string, warehouseName?: string): Promise<number> {
  const stock = await findStockRecord(partnerId, materialId, warehouseName);
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
  delta: number
): Promise<number> {
  const existing = await findStockRecord(partnerId, materialId, warehouseName);
  if (!existing) {
    const qtyOnHand = Math.max(0, delta);
    await createBusinessRecord(partnerId, "inventory-stock", {
      // Stored as the "CODE — Description" label, same format every
      // manual/bulk-import Stock row already uses (stockFormFields'
      // materialId select is built from getBomOptions().map(o => o.label))
      // — findStockRecord normalizes both shapes when matching either way.
      materialId: materialLabel || materialId,
      warehouseName,
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
 * Every material's Available Qty broken down per warehouse it has any
 * stock in — e.g. `{ "MAT-1001": "Central Warehouse — Bengaluru: 42 avail, Local Store — Indiranagar: 3 avail" }`.
 * Used to embed live availability straight into a Material dropdown's
 * option label (Stock Transfers/Return Orders) so a user can see what's
 * actually available before picking a quantity, without a separate
 * client-side lookup.
 */
export async function getAvailabilityByMaterial(partnerId: string): Promise<Map<string, string>> {
  const rows = await listBusinessRecords(partnerId, "inventory-stock");
  const byMaterial = new Map<string, string[]>();
  for (const r of rows) {
    const code = materialCode(r["materialId"]);
    const available = Number(r["availableQty"] ?? r["qtyOnHand"] ?? 0);
    if (available <= 0) continue;
    const entry = `${r["warehouseName"]}: ${available} avail`;
    byMaterial.set(code, [...(byMaterial.get(code) ?? []), entry]);
  }
  const result = new Map<string, string>();
  for (const [code, entries] of byMaterial) result.set(code, entries.join(", "));
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
  const existing = await findStockRecord(partnerId, materialId, warehouseName);
  const clamped = Math.max(0, qty);
  if (!existing) {
    await createBusinessRecord(partnerId, "inventory-stock", {
      materialId: materialLabel || materialId,
      warehouseName,
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
