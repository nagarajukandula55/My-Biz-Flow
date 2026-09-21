/**
 * Material Ageing — how long each Stock row has been sitting since it was
 * last replenished (see src/lib/inventoryStock.ts's lastReceivedAt, only
 * ever advanced on a genuine increase, never by selling/consuming). A row
 * from before that field existed falls back to recordCreatedAt (the real
 * DB insert timestamp businessRecords.ts's toRow() always stamps).
 */
import { listBusinessRecords } from "@/lib/businessRecords";

export const DEFAULT_AGEING_THRESHOLD_DAYS = 60;

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

  return result.sort((a, b) => b.ageDays - a.ageDays);
}
