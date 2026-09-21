/**
 * Shared Part Planning forecast math — used by
 * src/app/partner/[partnerId]/inventory/part-planning/page.tsx. Not a
 * statistical model: daily rate = window-days total consumed / window days,
 * days-left = current Good stock on hand / daily rate (Infinity when
 * nothing's been consumed in the window), suggested pre-order = one
 * window's worth of projected usage minus what's already on hand, floored
 * at 0.
 */
import { listBusinessRecords } from "@/lib/businessRecords";
import { getAvailabilityByMaterial } from "@/lib/inventoryStock";
import { summarizeConsumptionByMaterial } from "@/lib/sample-data/consumption";

export type ForecastRow = {
  materialId: string;
  materialLabel: string;
  totalQty: number;
  dailyRate: number;
  onHand: number;
  daysLeft: number;
  suggestedReorderQty: number;
};

/** Default forecast window, used until a partner sets their own via setForecastWindowAction. */
export const DEFAULT_FORECAST_WINDOW_DAYS = 30;

/** Partner-configurable forecast window is stored as a single BusinessRecord row — see setForecastWindowAction in the Part Planning module's actions.ts. */
export async function getForecastWindowDays(partnerId: string): Promise<number> {
  const rows = await listBusinessRecords(partnerId, "inventory-settings");
  const row = rows.find((r) => r["id"] === "forecast-window");
  const days = Number(row?.["windowDays"]);
  return Number.isFinite(days) && days > 0 ? Math.round(days) : DEFAULT_FORECAST_WINDOW_DAYS;
}

export async function computePartPlanningForecast(partnerId: string, windowDays: number): Promise<ForecastRow[]> {
  const [consumptionRows, availability] = await Promise.all([
    listBusinessRecords(partnerId, "inventory-consumption"),
    getAvailabilityByMaterial(partnerId),
  ]);

  const now = Date.now();
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  // Reversed lines (a cancelled/reopened workorder returning its parts)
  // don't count as real usage — same rule the Consumption report applies.
  const inWindow = consumptionRows.filter((r) => {
    if (r["reversedAt"]) return false;
    const d = new Date(String(r["consumedDate"] ?? ""));
    return !Number.isNaN(d.getTime()) && now - d.getTime() <= windowMs;
  });

  return summarizeConsumptionByMaterial(inWindow).map((m) => {
    const dailyRate = m.totalQty / windowDays;
    // availability map is keyed by bare material code; materialId here is
    // already that same code (see deductInventoryForWorkorderAction).
    const availableText = availability.get(m.materialId) ?? "";
    const onHand = availableText
      ? availableText.split(", ").reduce((sum, part) => sum + (Number(part.match(/:\s*(\d+)/)?.[1] ?? 0) || 0), 0)
      : 0;
    const daysLeft = dailyRate > 0 ? Math.round(onHand / dailyRate) : Infinity;
    const suggestedReorderQty = Math.max(0, Math.ceil(dailyRate * windowDays - onHand));
    return { ...m, dailyRate, onHand, daysLeft, suggestedReorderQty };
  });
}
