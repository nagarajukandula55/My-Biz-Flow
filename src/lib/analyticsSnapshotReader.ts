import { prisma } from "@/lib/prisma";
import type { ComboTrendPoint } from "@/components/charts/ComboTrendCard";

type Summary = {
  totalRevenue: number;
  paidInvoiceCount: number;
  thisMonthRevenue: number;
  thisMonthInvoiceCount: number;
  totalInvoices: number;
  totalWorkorders: number;
  openWorkorders: number;
  closedWorkorders: number;
};

function monthStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

async function enabledFor(partnerId: string, modules: readonly string[]): Promise<boolean> {
  const settings = await prisma.platformAnalyticsSettings.findUnique({ where: { id: "default" } });
  if (!settings?.snapshotReads) return false;
  const required = modules.filter((module) => module === "billing" || module === "service-centre");
  if (required.length === 0) return false;
  const jobs = await prisma.partnerAnalyticsBackfillJob.findMany({ where: { partnerId, moduleSlug: { in: required }, sourceVersion: 1 } });
  return required.every((module) => jobs.some((job) => job.moduleSlug === module && job.status === "COMPLETE"));
}

/** Returns null when the additive snapshot is not explicitly enabled/ready. */
export async function getSnapshotSummaryOrNull(partnerId: string, modules: readonly string[]): Promise<Summary | null> {
  try {
    if (!(await enabledFor(partnerId, modules))) return null;
    const rows = await prisma.partnerAnalyticsSnapshot.findMany({ where: { partnerId, moduleSlug: { in: modules.filter((m) => m === "billing" || m === "service-centre") } } });
  const start = monthStart(new Date());
  const billing = rows.filter((r) => r.moduleSlug === "billing");
  const service = rows.filter((r) => r.moduleSlug === "service-centre");
  const totalRevenue = billing.reduce((sum, row) => sum + Number(row.paidAmount), 0);
  const thisMonthBilling = billing.filter((row) => row.snapshotDate >= start);
  const totalWorkorders = service.reduce((sum, row) => sum + row.recordCount, 0);
  const closedWorkorders = service.reduce((sum, row) => sum + row.closedCount, 0);
  const cancelledWorkorders = service.reduce((sum, row) => sum + row.cancelledCount, 0);
    return {
    totalRevenue,
    paidInvoiceCount: billing.reduce((sum, row) => sum + row.paidCount, 0),
    thisMonthRevenue: thisMonthBilling.reduce((sum, row) => sum + Number(row.paidAmount), 0),
    thisMonthInvoiceCount: thisMonthBilling.reduce((sum, row) => sum + row.recordCount, 0),
    totalInvoices: billing.reduce((sum, row) => sum + row.recordCount, 0),
    totalWorkorders,
    openWorkorders: Math.max(0, totalWorkorders - closedWorkorders - cancelledWorkorders),
    closedWorkorders,
    };
  } catch {
    // Additive rollout must not make the existing analytics page depend on
    // migration timing. Missing tables, permissions, or partial rollout all
    // use the established analytics implementation instead.
    return null;
  }
}

export async function getSnapshotSixMonthTrendOrNull(partnerId: string): Promise<ComboTrendPoint[] | null> {
  try {
    if (!(await enabledFor(partnerId, ["billing", "service-centre"]))) return null;
  const now = new Date();
  const rangeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  const rows = await prisma.partnerAnalyticsSnapshot.findMany({ where: { partnerId, moduleSlug: { in: ["billing", "service-centre"] }, snapshotDate: { gte: rangeStart } } });
  const months: { key: string; label: string; revenue: number; workorders: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push({ key: `${date.getUTCFullYear()}-${date.getUTCMonth()}`, label: date.toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "Asia/Kolkata" }), revenue: 0, workorders: 0 });
  }
  const byKey = new Map(months.map((month) => [month.key, month]));
  for (const row of rows) {
    const bucket = byKey.get(`${row.snapshotDate.getUTCFullYear()}-${row.snapshotDate.getUTCMonth()}`);
    if (!bucket) continue;
    if (row.moduleSlug === "billing") bucket.revenue += Number(row.paidAmount);
    else bucket.workorders += row.recordCount;
  }
    return months.map((month) => ({ x: month.label, revenue: month.revenue, workorders: month.workorders }));
  } catch {
    return null;
  }
}
