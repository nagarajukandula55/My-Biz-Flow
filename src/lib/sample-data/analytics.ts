import type { Column, Row } from "@/components/DataTable";
import type { LineSeriesPoint } from "@/components/charts/LineChartCard";
import type { BarPoint } from "@/components/charts/BarChartCard";
import type { PieSlice } from "@/components/charts/PieChartCard";
import { getModule } from "@/lib/designer/moduleRegistry";
import { computeModuleStat } from "@/lib/moduleData";

// Analytics sample data — derived from the same MODULE_DATA every list page
// reads, plus one small hand-authored trend series (a 7-day revenue curve
// isn't derivable from the handful of static sample rows other modules
// carry, so this one series is authored directly rather than computed).

export const revenueTrend: LineSeriesPoint[] = [
  { x: "Mon", y: 18400 },
  { x: "Tue", y: 21200 },
  { x: "Wed", y: 19800 },
  { x: "Thu", y: 26100 },
  { x: "Fri", y: 31400 },
  { x: "Sat", y: 38900 },
  { x: "Sun", y: 24600 },
];

export async function getRecordsByModuleBarData(moduleSlugs: string[]): Promise<BarPoint[]> {
  return Promise.all(
    moduleSlugs.map(async (slug) => ({
      category: (await getModule(slug))?.label ?? slug,
      value: computeModuleStat(slug).count,
    }))
  );
}

export const workorderStatusBreakdown: PieSlice[] = [
  { name: "Diagnosed", value: 1 },
  { name: "In repair", value: 1 },
  { name: "Ready", value: 1 },
  { name: "Delivered", value: 1 },
];

export const recentActivityColumns: Column[] = [
  { key: "module", label: "Module", type: "text" },
  { key: "event", label: "Event", type: "text" },
  { key: "actor", label: "Actor", type: "text" },
  { key: "amount", label: "Amount", type: "currency" },
  { key: "timestamp", label: "When", type: "date" },
];

export const recentActivityRows: Row[] = [
  { module: "POS", event: "Sale rung up", actor: "Meena R.", amount: 1850, timestamp: "2026-08-07" },
  { module: "Service Centre", event: "Workorder marked Ready", actor: "Suresh M.", amount: 3200, timestamp: "2026-08-07" },
  { module: "Billing", event: "Invoice generated", actor: "Priya Sharma", amount: 12400, timestamp: "2026-08-06" },
  { module: "Inventory", event: "Stock reorder placed", actor: "Auto (low-stock rule)", amount: 8600, timestamp: "2026-08-06" },
  { module: "POS", event: "Refund processed", actor: "Meena R.", amount: -640, timestamp: "2026-08-05" },
];
