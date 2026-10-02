/**
 * Material Ageing — how long each Stock row has been sitting since it was
 * last replenished (see src/lib/inventoryStock.ts's lastReceivedAt, only
 * ever advanced on a genuine increase, never by selling/consuming). A row
 * from before that field existed falls back to recordCreatedAt (the real
 * DB insert timestamp businessRecords.ts's toRow() always stamps).
 */
import { listBusinessRecords } from "@/lib/businessRecords";
import { prisma } from "@/lib/prisma";

export const DEFAULT_AGEING_THRESHOLD_DAYS = 60;

function bareMaterialCode(materialId: string): string {
  return materialId.split(" — ")[0].trim();
}

export async function getAgeingThresholdDays(partnerId: string): Promise<number> {
  const rows = await listBusinessRecords(partnerId, "inventory-settings");
  const row = rows.find((r) => r["id"] === "ageing-threshold");
  const days = Number(row?.["thresholdDays"]);
  return Number.isFinite(days) && days > 0 ? Math.round(days) : DEFAULT_AGEING_THRESHOLD_DAYS;
}

export type AgeingRow = {
  stockId: string;
  materialId: string;
  warehouseName: string;
  condition: "Good" | "Defective";
  qtyOnHand: number;
  lastReceivedAt: string;
  ageDays: number;
  /** ageDays as a fraction of the threshold — drives the Fresh/Watch/Aging banding, not a raw day count, so the same three-way color scheme reads sensibly whether the threshold is 30 days or 180. */
  pctOfThreshold: number;
  status: "Fresh" | "Watch" | "Aging";
  /** Present (possibly empty) only when the material has at least one Serialized StockLot — the individual serial/barcode numbers still remaining on hand for this material+warehouse+condition, from StockLot (prisma/schema.prisma), not derivable from the aggregate inventory-stock row alone. */
  serialNumbers?: string[];
};

/** Every Stock row (Good AND Defective — ageing Defective stock is exactly the kind of thing that should push a partner toward an Outbound Return Order) with qty > 0, aged and banded against the partner's threshold. */
export async function computeAgeingRows(partnerId: string, thresholdDays: number): Promise<AgeingRow[]> {
  const rows = await listBusinessRecords(partnerId, "inventory-stock");
  const now = Date.now();
  const result: AgeingRow[] = [];

  for (const r of rows) {
    const qtyOnHand = Number(r["qtyOnHand"] ?? 0);
    if (qtyOnHand <= 0) continue;

    const lastReceivedAt = String(r["lastReceivedAt"] ?? r["recordCreatedAt"] ?? "");
    const receivedTime = new Date(lastReceivedAt).getTime();
    if (Number.isNaN(receivedTime)) continue; // no usable date at all — skip rather than show a nonsense age

    const ageDays = Math.floor((now - receivedTime) / (24 * 60 * 60 * 1000));
    const pctOfThreshold = ageDays / thresholdDays;
    const status: AgeingRow["status"] = pctOfThreshold >= 1 ? "Aging" : pctOfThreshold >= 0.5 ? "Watch" : "Fresh";

    result.push({
      stockId: String(r["id"]),
      materialId: String(r["materialId"] ?? ""),
      warehouseName: String(r["warehouseName"] ?? ""),
      condition: r["condition"] === "Defective" ? "Defective" : "Good",
      qtyOnHand,
      lastReceivedAt,
      ageDays,
      pctOfThreshold,
      status,
    });
  }

  // One query for every Serialized lot still on hand (quantityRemaining > 0,
  // serialNumber set) — cheaper than a per-row query, then grouped below by
  // the same (materialId, warehouseName, condition) key each AgeingRow uses.
  const serializedLots = await prisma.stockLot.findMany({
    where: { partnerId, serialized: true, quantityRemaining: { gt: 0 }, serialNumber: { not: null } },
    select: { materialId: true, warehouseName: true, condition: true, serialNumber: true },
  });
  const serialsByKey = new Map<string, string[]>();
  for (const lot of serializedLots) {
    const key = `${lot.materialId}|${lot.warehouseName ?? ""}|${lot.condition ?? "Good"}`;
    const list = serialsByKey.get(key) ?? [];
    if (lot.serialNumber) list.push(lot.serialNumber);
    serialsByKey.set(key, list);
  }
  for (const row of result) {
    const key = `${bareMaterialCode(row.materialId)}|${row.warehouseName}|${row.condition}`;
    const serials = serialsByKey.get(key);
    if (serials) row.serialNumbers = serials;
  }

  return result.sort((a, b) => b.ageDays - a.ageDays);
}
