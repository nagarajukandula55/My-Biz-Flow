/**
 * Shared Part Planning forecast math — used by
 * src/app/partner/[partnerId]/inventory/part-planning/page.tsx. Not a
 * statistical model: daily rate = window-days total consumed / window days,
 * days-left = current Good stock on hand / daily rate (Infinity when
 * nothing's been consumed in the window), suggested pre-order = one
 * window's worth of projected usage minus what's already on hand, floored
 * at 0. Also surfaces each material's static BOM "Reorder Level" (a
 * partner-set minimum, e.g. for safety-critical or long-lead-time parts)
 * alongside the computed signal — the two are independent: a part with
 * zero recent consumption isn't flagged urgent just for sitting below a
 * static threshold nobody has recalibrated, but the static level still
 * shows so the partner can act on it deliberately.
 */
import { listBusinessRecords, listBusinessRecordsSince, getBusinessRecordsByKeys } from "@/lib/businessRecords";
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
  /** Static BOM "Reorder Level" for this material, if set — undefined when the material has none or isn't in the BOM catalog. */
  staticReorderLevel: number | undefined;
  /** True when on-hand is below the static reorder level — independent of the consumption-based days-left signal. */
  belowStaticReorderLevel: boolean;
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
  // consumedDate is stored "YYYY-MM-DD" (see deductInventoryForWorkorderAction),
  // so a lexical gte on that same format is a safe, Prisma-side narrowing —
  // avoids pulling the whole consumption table into memory on every load.
  const sinceIso = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [consumptionRows, availability] = await Promise.all([
    listBusinessRecordsSince(partnerId, "inventory-consumption", "consumedDate", sinceIso),
    getAvailabilityByMaterial(partnerId),
  ]);

  // Reversed lines (a cancelled/reopened workorder returning its parts)
  // don't count as real usage — same rule the Consumption report applies.
  const inWindow = consumptionRows.filter((r) => !r["reversedAt"]);

  const summarized = summarizeConsumptionByMaterial(inWindow);

  // Only fetch static Reorder Level for materials that actually showed up
  // in this window's consumption — bounded by `recordKey: { in: [...] }`,
  // never a full BOM catalog scan.
  const staticLevels = await getBusinessRecordsByKeys(
    partnerId,
    "inventory-bom",
    summarized.map((m) => m.materialId)
  );

  return summarized.map((m) => {
    const dailyRate = m.totalQty / windowDays;
    // availability map is keyed by bare material code; materialId here is
    // already that same code (see deductInventoryForWorkorderAction).
    const availableText = availability.get(m.materialId) ?? "";
    const onHand = availableText
      ? availableText.split(", ").reduce((sum, part) => sum + (Number(part.match(/:\s*(\d+)/)?.[1] ?? 0) || 0), 0)
      : 0;
    const daysLeft = dailyRate > 0 ? Math.round(onHand / dailyRate) : Infinity;
    const suggestedReorderQty = Math.max(0, Math.ceil(dailyRate * windowDays - onHand));
    const staticLevelRaw = Number(staticLevels.get(m.materialId)?.["reorderLevel"]);
    const staticReorderLevel = Number.isFinite(staticLevelRaw) && staticLevelRaw > 0 ? staticLevelRaw : undefined;
    const belowStaticReorderLevel = staticReorderLevel !== undefined && onHand < staticReorderLevel;
    return { ...m, dailyRate, onHand, daysLeft, suggestedReorderQty, staticReorderLevel, belowStaticReorderLevel };
  });
}
