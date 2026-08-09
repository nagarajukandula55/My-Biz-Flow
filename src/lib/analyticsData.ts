/**
 * Real per-vendor analytics aggregation, backed directly by the generic
 * `BusinessRecord` table (see src/lib/businessRecords.ts) — replaces the
 * old hand-authored revenue trend / activity feed sample data. Uses
 * MODULE_DATA (src/lib/moduleData.ts) only for its static column
 * definitions (schema, not rows) to find each module's currency field.
 */
import { prisma } from "@/lib/prisma";
import type { Row } from "@/components/DataTable";
import type { LineSeriesPoint } from "@/components/charts/LineChartCard";
import type { BarPoint } from "@/components/charts/BarChartCard";
import type { PieSlice } from "@/components/charts/PieChartCard";
import { MODULE_DATA } from "@/lib/moduleData";
import { getModule } from "@/lib/designer/moduleRegistry";
import { WORKORDER_STAGES, type WorkorderStage } from "@/lib/sample-data/service-centre";

export async function computeModuleStat(
  vendorId: string,
  slug: string
): Promise<{ count: number; currencySum?: number }> {
  const columns = MODULE_DATA[slug]?.columns;
  if (!columns) return { count: 0 };
  const rows = await prisma.businessRecord.findMany({
    where: { vendorId, moduleSlug: slug },
    select: { data: true },
  });
  const currencyColumn = columns.find((c) => c.type === "currency");
  if (!currencyColumn) return { count: rows.length };
  const sum = rows.reduce((total, r) => {
    const value = (r.data as Record<string, unknown>)[currencyColumn.key];
    return total + (typeof value === "number" ? value : 0);
  }, 0);
  return { count: rows.length, currencySum: sum };
}

export async function getRecordsByModuleBarData(vendorId: string, moduleSlugs: string[]): Promise<BarPoint[]> {
  return Promise.all(
    moduleSlugs.map(async (slug) => ({
      category: (await getModule(slug))?.label ?? slug,
      value: (await computeModuleStat(vendorId, slug)).count,
    }))
  );
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Last 7 days of Billing totalAmount, bucketed by the record's creation day. */
export async function getRevenueTrend(vendorId: string): Promise<LineSeriesPoint[]> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - 6);

  const rows = await prisma.businessRecord.findMany({
    where: { vendorId, moduleSlug: "billing", createdAt: { gte: since } },
    select: { data: true, createdAt: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    buckets.set(d.toDateString(), 0);
  }
  for (const r of rows) {
    const key = r.createdAt.toDateString();
    if (!buckets.has(key)) continue;
    const data = r.data as Record<string, unknown>;
    const amount = typeof data.totalAmount === "number" ? data.totalAmount : 0;
    buckets.set(key, (buckets.get(key) ?? 0) + amount);
  }

  return Array.from(buckets.entries()).map(([dateStr, y]) => ({
    x: DAY_LABELS[new Date(dateStr).getDay()],
    y,
  }));
}

export async function getWorkorderStatusBreakdown(vendorId: string): Promise<PieSlice[]> {
  const rows = await prisma.businessRecord.findMany({
    where: { vendorId, moduleSlug: "service-centre" },
    select: { data: true },
  });
  const counts = new Map<WorkorderStage, number>(WORKORDER_STAGES.map((s) => [s, 0]));
  for (const r of rows) {
    const data = r.data as Record<string, unknown>;
    const stage = WORKORDER_STAGES.includes(data.stage as WorkorderStage) ? (data.stage as WorkorderStage) : "Created";
    counts.set(stage, (counts.get(stage) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
}

export const recentActivityColumns = [
  { key: "module", label: "Module", type: "text" as const },
  { key: "event", label: "Event", type: "text" as const },
  { key: "amount", label: "Amount", type: "currency" as const },
  { key: "timestamp", label: "When", type: "date" as const },
];

/** Most recently created records across a vendor's enabled modules, newest first. */
export async function getRecentActivity(vendorId: string, moduleSlugs: string[], limit = 8): Promise<Row[]> {
  const rows = await prisma.businessRecord.findMany({
    where: { vendorId, moduleSlug: { in: moduleSlugs } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return Promise.all(
    rows.map(async (r) => {
      const mod = await getModule(r.moduleSlug);
      const columns = MODULE_DATA[r.moduleSlug]?.columns ?? [];
      const currencyColumn = columns.find((c) => c.type === "currency");
      const data = r.data as Record<string, unknown>;
      const amount = currencyColumn && typeof data[currencyColumn.key] === "number" ? (data[currencyColumn.key] as number) : 0;
      return {
        module: mod?.label ?? r.moduleSlug,
        event: `${r.recordKey} created`,
        amount,
        timestamp: r.createdAt.toISOString().slice(0, 10),
      };
    })
  );
}
