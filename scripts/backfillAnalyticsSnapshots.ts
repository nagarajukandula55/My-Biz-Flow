import { PrismaClient } from "@prisma/client";

/**
 * Resumable, additive analytics backfill.
 *
 * Usage:
 *   npx tsx scripts/backfillAnalyticsSnapshots.ts --partner VND0001 --module billing
 *
 * It processes only 250 source rows per transaction, checkpoints by
 * (createdAt,id), and never deletes or truncates anything. Run it from the
 * production-migration workflow only after the additive migration exists.
 */
const prisma = new PrismaClient();
const BATCH_SIZE = 250;
const allowedModules = new Set(["billing", "service-centre"]);

function arg(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function dayUtc(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

async function main() {
  const partnerId = arg("--partner");
  const moduleSlug = arg("--module");
  if (!allowedModules.has(moduleSlug)) throw new Error("Only billing and service-centre are supported by this backfill.");

  const job = await prisma.partnerAnalyticsBackfillJob.upsert({
    where: { partnerId_moduleSlug_sourceVersion: { partnerId, moduleSlug, sourceVersion: 1 } },
    create: { partnerId, moduleSlug, sourceVersion: 1, status: "RUNNING", startedAt: new Date() },
    update: { status: "RUNNING", lastError: null, startedAt: new Date() },
  });

  try {
    let cursorCreatedAt = job.cursorCreatedAt;
    let cursorId = job.cursorId;
    for (;;) {
      const rows = await prisma.businessRecord.findMany({
        where: {
          partnerId,
          moduleSlug,
          ...(cursorCreatedAt && cursorId
            ? { OR: [{ createdAt: { gt: cursorCreatedAt } }, { createdAt: cursorCreatedAt, id: { gt: cursorId } }] }
            : {}),
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: BATCH_SIZE,
        select: { id: true, data: true, createdAt: true },
      });
      if (rows.length === 0) break;

      const daily = new Map<string, {
        snapshotDate: Date;
        recordCount: number;
        paidCount: number;
        paidAmount: number;
        closedCount: number;
        cancelledCount: number;
        processedUntil: Date;
      }>();
      for (const row of rows) {
        const data = (row.data ?? {}) as Record<string, unknown>;
        const paid = typeof data.amountPaid === "number" ? data.amountPaid : data.paymentStatus === "Paid" && typeof data.totalAmount === "number" ? data.totalAmount : 0;
        const isClosed = moduleSlug === "service-centre" && (data.stage === "Closed" || Array.isArray(data.stageHistory) && data.stageHistory.some((entry: any) => entry?.stage === "Closed"));
        const isCancelled = moduleSlug === "service-centre" && Boolean(data.cancelledAt);
        const snapshotDate = dayUtc(row.createdAt);
        const key = snapshotDate.toISOString();
        const current = daily.get(key) ?? { snapshotDate, recordCount: 0, paidCount: 0, paidAmount: 0, closedCount: 0, cancelledCount: 0, processedUntil: row.createdAt };
        current.recordCount += 1;
        current.paidCount += paid > 0 ? 1 : 0;
        current.paidAmount += paid;
        current.closedCount += isClosed ? 1 : 0;
        current.cancelledCount += isCancelled ? 1 : 0;
        if (row.createdAt > current.processedUntil) current.processedUntil = row.createdAt;
        daily.set(key, current);
      }

      await prisma.$transaction(async (tx) => {
        for (const item of daily.values()) {
          await tx.partnerAnalyticsSnapshot.upsert({
            where: { partnerId_moduleSlug_snapshotDate: { partnerId, moduleSlug, snapshotDate: item.snapshotDate } },
            create: { partnerId, moduleSlug, snapshotDate: item.snapshotDate, recordCount: item.recordCount, paidCount: item.paidCount, paidAmount: item.paidAmount, closedCount: item.closedCount, cancelledCount: item.cancelledCount, processedUntil: item.processedUntil },
            update: { recordCount: { increment: item.recordCount }, paidCount: { increment: item.paidCount }, paidAmount: { increment: item.paidAmount }, closedCount: { increment: item.closedCount }, cancelledCount: { increment: item.cancelledCount }, processedUntil: item.processedUntil },
          });
        }
        const last = rows[rows.length - 1];
        await tx.partnerAnalyticsBackfillJob.update({ where: { id: job.id }, data: { cursorCreatedAt: last.createdAt, cursorId: last.id, rowsProcessed: { increment: rows.length } } });
      });
      cursorCreatedAt = rows[rows.length - 1].createdAt;
      cursorId = rows[rows.length - 1].id;
      console.log(`Processed ${rows.length} rows; cursor=${cursorCreatedAt.toISOString()}/${cursorId}`);
    }
    await prisma.partnerAnalyticsBackfillJob.update({ where: { id: job.id }, data: { status: "COMPLETE", completedAt: new Date() } });
  } catch (error) {
    await prisma.partnerAnalyticsBackfillJob.update({ where: { id: job.id }, data: { status: "FAILED", lastError: error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000) } });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  // Keep the workflow failure actionable. The job row already records the
  // bounded operation's last error; this also exposes the exact Prisma
  // failure in GitHub Actions without logging connection-string values.
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
