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

/** Which day the cron should actually send each frequency on — DAILY every run, WEEKLY only Monday, MONTHLY only the 1st. Reports cover the immediately preceding, now-complete period, not "so far today". */
export function shouldSendReportToday(frequency: ReportFrequency, now: Date): boolean {
  if (frequency === "DAILY") return true;
  if (frequency === "WEEKLY") return now.getDay() === 1; // Monday
  return now.getDate() === 1; // MONTHLY
}

/** True once this partner has already gotten (or had an attempted) send today — Vercel Cron doesn't guarantee exactly-once, so this is the idempotency check. All three frequencies only ever trigger once per calendar day (see shouldSendReportToday), so a same-day check is sufficient for all of them. */
export function alreadySentToday(lastReportSentAt: Date | null, now: Date): boolean {
  if (!lastReportSentAt) return false;
  return lastReportSentAt.toDateString() === now.toDateString();
}

/** [start, end) for the just-completed period this digest reports on. */
export function reportPeriodRange(frequency: ReportFrequency, now: Date): { start: Date; end: Date; priorStart: Date; priorEnd: Date } {
  const end = new Date(now);
  end.setHours(0, 0, 0, 0); // today's midnight -- exclusive upper bound, so "today so far" is never included
  if (frequency === "DAILY") {
    const start = new Date(end);
    start.setDate(start.getDate() - 1);
    const priorEnd = start;
    const priorStart = new Date(priorEnd);
    priorStart.setDate(priorStart.getDate() - 1);
    return { start, end, priorStart, priorEnd };
  }
  if (frequency === "WEEKLY") {
    // now.getDay()===1 (Monday) when this runs -- end is this Monday's
    // midnight, so [start,end) is exactly the prior Mon-Sun week.
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    const priorEnd = start;
    const priorStart = new Date(priorEnd);
    priorStart.setDate(priorStart.getDate() - 7);
    return { start, end, priorStart, priorEnd };
  }
  // MONTHLY -- runs on the 1st, so end (today's midnight) is the 1st of
  // this month; [start,end) is exactly the prior full calendar month.
  const start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
  const priorEnd = start;
  const priorStart = new Date(priorEnd.getFullYear(), priorEnd.getMonth() - 1, 1);
  return { start, end, priorStart, priorEnd };
}

export type PartnerReportStats = {
  revenue: number;
  invoiceCount: number;
  workorderCount: number;
};

async function statsForRange(partnerId: string, start: Date, end: Date): Promise<PartnerReportStats> {
  const [billingRows, workorderRows] = await Promise.all([
    prisma.businessRecord.findMany({
      where: { partnerId, moduleSlug: "billing", createdAt: { gte: start, lt: end } },
      select: { data: true },
    }),
    prisma.businessRecord.count({
      where: { partnerId, moduleSlug: "service-centre", createdAt: { gte: start, lt: end } },
    }),
  ]);

  let revenue = 0;
  for (const r of billingRows) {
    const data = r.data as Record<string, unknown>;
    if (typeof data.amountPaid === "number") revenue += data.amountPaid;
    else if (data.paymentStatus === "Paid" && typeof data.totalAmount === "number") revenue += data.totalAmount;
  }

  return { revenue, invoiceCount: billingRows.length, workorderCount: workorderRows };
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
