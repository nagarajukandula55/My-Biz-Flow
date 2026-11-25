/** Stock reads and pure serial helpers, separated from server transaction machinery. */
import { listBusinessRecords } from "@/lib/businessRecords";
import type { Row } from "@/components/DataTable";

export function materialCode(value: unknown): string {
  // Most current records use "CODE - Description", but older imports and
  // screens have also produced en/em dashes.  Stock identity is the code;
  // accepting all three separators prevents existing stock from becoming
  // invisible merely because its display label was saved by an older UI.
  return String(value ?? "").split(/\s[-–—]\s/, 1)[0].trim();
}

export function parseSerialNumbers(raw: unknown): string[] {
  return String(raw ?? "")
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function validateSerialNumbers(serials: string[], quantity: number, materialLabel: string): string | null {
  if (serials.length !== quantity) {
    return `${materialLabel} is a serialized material — enter exactly ${quantity} serial/barcode number${quantity === 1 ? "" : "s"} (one per line), got ${serials.length}.`;
  }
  if (new Set(serials).size !== serials.length) {
    return "Duplicate serial/barcode numbers entered — each unit needs a distinct one.";
  }
  return null;
}

export type StockCondition = "Good" | "Defective";

function rowCondition(r: Row): StockCondition {
  return r["condition"] === "Defective" ? "Defective" : "Good";
}

/**
 * `availableQty` is a denormalized convenience field and some older stock
 * rows contain a stale zero even though qtyOnHand is positive.  Physical
 * availability is always derived from the two source fields when on-hand is
 * present; the stored availableQty is only a backwards-compatible fallback.
 */
export function availableQtyForStockRow(r: Row): number {
  const onHand = Number(r["qtyOnHand"]);
  if (Number.isFinite(onHand)) {
    const reserved = Number(r["reservedQty"] ?? 0);
    return Math.max(0, onHand - (Number.isFinite(reserved) ? reserved : 0));
  }
  const stored = Number(r["availableQty"] ?? 0);
  return Number.isFinite(stored) ? Math.max(0, stored) : 0;
}

export type AvailableStockRow = {
  row: Row;
  materialCode: string;
  warehouseName: string;
  available: number;
};

/** All usable Good-stock buckets for a material, largest available first. */
export async function getAvailableStockRows(partnerId: string, materialId: string): Promise<AvailableStockRow[]> {
  const code = materialCode(materialId);
  const rows = await listBusinessRecords(partnerId, "inventory-stock");
  return rows
    .filter((row) => rowCondition(row) === "Good" && materialCode(row["materialId"]) === code)
    .map((row) => ({
      row,
      materialCode: code,
      warehouseName: String(row["warehouseName"] ?? ""),
      available: availableQtyForStockRow(row),
    }))
    .filter((entry) => entry.available > 0)
    .sort((a, b) => b.available - a.available);
}

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

export async function getAvailabilityByMaterial(partnerId: string): Promise<Map<string, string>> {
  const detail = await getAvailabilityDetailByMaterial(partnerId);
  const result = new Map<string, string>();
  for (const [code, { text }] of detail) result.set(code, text);
  return result;
}

export async function getAvailabilityDetailByMaterial(partnerId: string): Promise<Map<string, { text: string; total: number }>> {
  const rows = await listBusinessRecords(partnerId, "inventory-stock");
  const byMaterial = new Map<string, { entries: string[]; total: number }>();
  for (const r of rows) {
    if (rowCondition(r) !== "Good") continue; // Defective stock isn't usable/sellable — never counts as "available"
    const code = materialCode(r["materialId"]);
    const available = availableQtyForStockRow(r);
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
