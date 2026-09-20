/**
 * Persisted history of scheduled/manual report *runs* (one row per cron
 * invocation or Super Admin "push now"), so "was today's DAILY digest
 * triggered, and did it fully succeed" can be answered by reading a table
 * instead of only ever reaching a Telegram ops chat in the moment.
 *
 * Backed by the `ReportRunLogEntry` Prisma table (see prisma/schema.prisma).
 * Written from src/lib/telegramReportData.ts's sendReportRunOpsSummary,
 * which every report-triggering path (cron, manual push) already funnels
 * through.
 */

import { prisma } from "@/lib/prisma";
import type { ReportPushDetail } from "@/lib/telegramReportData";

export type ReportRun = {
  id: string;
  cadence: string;
  trigger: "cron" | "manual";
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
  details: ReportPushDetail[];
  createdAt: string;
};

const MAX_ENTRIES = 500;

export async function logReportRun(input: {
  cadence: string;
  trigger: "cron" | "manual";
  attempted: number;
  sent: number;
  failed: number;
  skipped?: number;
  details: ReportPushDetail[];
}): Promise<void> {
  try {
    await prisma.reportRunLogEntry.create({
      data: {
        id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        cadence: input.cadence,
        trigger: input.trigger,
        attempted: input.attempted,
        sent: input.sent,
        failed: input.failed,
        skipped: input.skipped ?? 0,
        details: input.details,
      },
    });

    const count = await prisma.reportRunLogEntry.count();
    if (count > MAX_ENTRIES) {
      const stale = await prisma.reportRunLogEntry.findMany({
        orderBy: { createdAt: "asc" },
        take: count - MAX_ENTRIES,
        select: { id: true },
      });
      await prisma.reportRunLogEntry.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
    }
  } catch (err) {
    console.error("[logReportRun] failed:", err);
  }
}

export async function getReportRuns(limit = 100): Promise<ReportRun[]> {
  const rows = await prisma.reportRunLogEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    cadence: r.cadence,
    trigger: r.trigger as "cron" | "manual",
    attempted: r.attempted,
    sent: r.sent,
    failed: r.failed,
    skipped: r.skipped,
    details: r.details as ReportPushDetail[],
    createdAt: r.createdAt.toISOString(),
  }));
}
