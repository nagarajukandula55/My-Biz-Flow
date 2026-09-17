/**
 * Data + scheduling logic behind the automatic Telegram business-summary
 * digest — the piece that was missing: TelegramSettings.reportFrequency was
 * saved but nothing ever computed a real per-partner period summary or sent
 * it. See /api/cron/telegram-reports for the actual trigger.
 *
 * Every query below is scoped by `partnerId` (same as every other function
 * in src/lib/analyticsData.ts) — one partner's digest can never include
 * another partner's revenue/workorders.
 */
import { prisma } from "@/lib/prisma";
import type { ReportFrequency } from "@/lib/telegramTemplates";

/** True when `now` falls on the last calendar day of its month. */
function isLastDayOfMonth(now: Date): boolean {
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() === now.getDate();
}

/** Which day the cron should actually send each frequency on — DAILY every run (9 PM IST), WEEKLY only Saturday (9 PM IST), MONTHLY only the last day of the month (9 PM IST). Reports cover the immediately preceding, now-complete period, not "so far today". */
export function shouldSendReportToday(frequency: ReportFrequency, now: Date): boolean {
  if (frequency === "DAILY") return true;
  if (frequency === "WEEKLY") return now.getDay() === 6; // Saturday
  return isLastDayOfMonth(now); // MONTHLY
}

/** True once this partner has already gotten (or had an attempted) send today — Vercel Cron doesn't guarantee exactly-once, so this is the idempotency check. All three frequencies only ever trigger once per calendar day (see shouldSendReportToday), so a same-day check is sufficient for all of them. */
export function alreadySentToday(lastReportSentAt: Date | null, now: Date): boolean {
  if (!lastReportSentAt) return false;
  return lastReportSentAt.toDateString() === now.toDateString();
}

/**
 * [start, end) for the just-completed period this digest reports on. Runs
 * at 9 PM (see .github/workflows/cron.yml) — close enough to end-of-day
 * that TODAY's business is treated as the completed period rather than
 * making a partner wait until tomorrow morning to hear about today.
 */
export function reportPeriodRange(frequency: ReportFrequency, now: Date): { start: Date; end: Date; priorStart: Date; priorEnd: Date } {
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);

  if (frequency === "DAILY") {
    // Today (00:00 -> now, i.e. through the 9 PM send) vs. the full prior day.
    const start = todayMidnight;
    const priorEnd = start;
    const priorStart = new Date(priorEnd);
    priorStart.setDate(priorStart.getDate() - 1);
    return { start, end: now, priorStart, priorEnd };
  }
  if (frequency === "WEEKLY") {
    // Runs Saturday evening -- the trailing 7 days through now (Sun-Sat) vs. the 7 days before that.
    const start = new Date(todayMidnight);
    start.setDate(start.getDate() - 6);
    const priorEnd = start;
    const priorStart = new Date(priorEnd);
    priorStart.setDate(priorStart.getDate() - 7);
    return { start, end: now, priorStart, priorEnd };
  }
  // MONTHLY -- runs on the last day of the month, evening, so the period
  // that just "completed" is the current calendar month itself (1st ->
  // now), vs. the full prior calendar month.
  const start = new Date(todayMidnight.getFullYear(), todayMidnight.getMonth(), 1);
  const priorStart = new Date(todayMidnight.getFullYear(), todayMidnight.getMonth() - 1, 1);
  const priorEnd = start;
  return { start, end: now, priorStart, priorEnd };
}

export type PartnerReportStats = {
  revenue: number;
  invoiceCount: number;
  workorderCount: number;
};

/**
 * Revenue-bearing modules this digest pulls from — deliberately only the
 * ones whose amount/status field names and semantics have actually been
 * checked here (billing's amountPaid/paymentStatus convention, POS's
 * totalAmount/status="Completed"), not every vertical in
 * src/lib/designer/modules.ts. A module with an unverified field shape
 * getting silently summed as ₹0 (or double-counted) would be worse than
 * this digest simply not covering it yet — see this function's own
 * per-module comments for exactly what's included and why.
 */
async function statsForRange(partnerId: string, start: Date, end: Date): Promise<PartnerReportStats> {
  const dateFilter = { gte: start, lt: end };
  const [billingRows, posRows, workorderCount] = await Promise.all([
    prisma.businessRecord.findMany({
      where: { partnerId, moduleSlug: "billing", createdAt: dateFilter },
      select: { data: true },
    }),
    prisma.businessRecord.findMany({
      where: { partnerId, moduleSlug: "pos", createdAt: dateFilter },
      select: { data: true },
    }),
    prisma.businessRecord.count({
      where: { partnerId, moduleSlug: "service-centre", createdAt: dateFilter },
    }),
  ]);

  let revenue = 0;
  for (const r of billingRows) {
    const data = r.data as Record<string, unknown>;
    if (typeof data.amountPaid === "number") revenue += data.amountPaid;
    else if (data.paymentStatus === "Paid" && typeof data.totalAmount === "number") revenue += data.totalAmount;
  }
  let posSaleCount = 0;
  for (const r of posRows) {
    const data = r.data as Record<string, unknown>;
    if (data.status === "Voided") continue;
    posSaleCount += 1;
    if (typeof data.totalAmount === "number") revenue += data.totalAmount;
  }

  return {
    revenue,
    invoiceCount: billingRows.length,
    // "Workorders" in the digest's own copy (telegramTemplates.ts's
    // businessReportMessage) reads naturally for a Service Centre; for
    // every other module family it's really "completed sales/orders" —
    // summing both under one number keeps the report to the three fixed
    // slots the template already has, rather than a growing per-module list.
    workorderCount: workorderCount + posSaleCount,
  };
}

export type PartnerReportComparison = {
  current: PartnerReportStats;
  prior: PartnerReportStats;
  changePct: string;
};

/** Real, partner-scoped current-vs-prior-period revenue/invoice/workorder comparison for one partner's digest. */
export async function computePartnerReportComparison(
  partnerId: string,
  frequency: ReportFrequency,
  now: Date
): Promise<PartnerReportComparison> {
  const { start, end, priorStart, priorEnd } = reportPeriodRange(frequency, now);
  const [current, prior] = await Promise.all([
    statsForRange(partnerId, start, end),
    statsForRange(partnerId, priorStart, priorEnd),
  ]);
  const changePct = prior.revenue === 0 ? "n/a" : `${(((current.revenue - prior.revenue) / prior.revenue) * 100).toFixed(1)}%`;
  return { current, prior, changePct };
}
