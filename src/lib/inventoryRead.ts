/** Stock reads and pure serial helpers, separated from server transaction machinery. */
import { listBusinessRecords } from "@/lib/businessRecords";
import type { Row } from "@/components/DataTable";

function materialCode(value: unknown): string {
  return String(value ?? "").split(" — ")[0].trim();
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
