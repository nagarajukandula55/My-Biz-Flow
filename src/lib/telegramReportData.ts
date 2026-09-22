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
import { businessReportMessage, type ReportFrequency } from "@/lib/telegramTemplates";
import { getPartner, listPartners } from "@/lib/partnerData";
import { listPartnersWithReportsEnabled, sendPartnerTelegramAlert, sendPartnerTelegramReport, sendRawTelegramMessage } from "@/lib/telegram";
import { getOpsChatId } from "@/lib/platformSettings";
import { logReportRun } from "@/lib/reportRunLog";

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

/**
 * True only when `now` falls in the ~9 PM IST send window. GitHub Actions
 * `schedule` triggers are best-effort and can fire late by anywhere from
 * minutes to hours under load (confirmed via actual run history drifting
 * across 08:00-20:00 UTC instead of landing at the configured 15:30 UTC).
 * Since the cron endpoint doesn't otherwise check the hour, a late-firing
 * run used to send the digest whenever it happened to land instead of at
 * 9 PM. The workflow now triggers every 15 min through this window (see
 * .github/workflows/cron.yml) and this guard — combined with the existing
 * alreadySentToday same-day idempotency check — makes sure the actual send
 * still only happens once, inside the window, regardless of how many times
 * the delayed schedule fires or how late any single run lands.
 */
export function isWithinReportWindow(now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const minutesSinceMidnight = hour * 60 + minute;
  return minutesSinceMidnight >= 20 * 60 + 45 && minutesSinceMidnight <= 22 * 60; // 20:45-22:00 IST
}

/** True once this partner has already gotten (or had an attempted) send today for this cadence — Vercel Cron doesn't guarantee exactly-once, so this is the idempotency check. Each cadence only ever triggers once per calendar day (see shouldSendReportToday), so a same-day check per cadence is sufficient. `lastReportSentAt` is TelegramSettingsRecord's per-cadence stamp map (src/lib/telegram.ts). */
export function alreadySentToday(lastReportSentAt: Date | null | undefined, now: Date): boolean {
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
export async function statsForRange(partnerId: string, start: Date, end: Date): Promise<PartnerReportStats> {
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

export function formatInr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export type ReportPushDetail = {
  partnerId: string;
  businessName: string;
  ok: boolean;
  /** True when this partner was never attempted (not due today / already sent today for this cadence) rather than attempted-and-failed. */
  skipped?: boolean;
  error?: string;
};
export type ReportPushResult = {
  cadence: ReportFrequency;
  attempted: number;
  sent: number;
  failed: number;
  details: ReportPushDetail[];
};

const FREQUENCY_LABEL: Record<ReportFrequency, string> = { DAILY: "Daily", WEEKLY: "Weekly", MONTHLY: "Monthly" };

/**
 * Builds and sends one partner's digest for the given frequency — the exact
 * send this frequency's automatic cron run performs for a due partner,
 * pulled out so the manual "push report now" bridge (src/app/api/admin/
 * push-reports/route.ts) can reuse it without duplicating the
 * comparison/template/send sequence.
 *
 * Always follows up with an explicit, separate confirmation message to the
 * partner's own Telegram — "✅ sent" or "❌ not delivered" — so a partner
 * never has to infer from silence whether today's report actually went
 * out. Uses sendPartnerTelegramReport's real delivery result (not just
 * "an attempt was made"), since a broken/disconnected chat previously
 * looked identical to a successful send from the caller's side.
 *
 * Throws on any failure — building the report (partner not found, stats
 * query failed) same as before, AND now also a genuine delivery failure
 * (chat disconnected, bot blocked/token missing) — so pushTelegramReportsNow
 * and the cron route's per-partner ReportPushDetail (and therefore the ops
 * summary's "Did not receive" list) stay accurate. The confirmation message
 * is always sent first regardless, so the partner's own Telegram reflects
 * the outcome independently of what the caller does with the thrown error.
 */
export async function sendOnePartnerReport(partnerId: string, frequency: ReportFrequency, now: Date): Promise<void> {
  const partner = await getPartner(partnerId);
  if (!partner) throw new Error("Partner not found");

  const { current, prior, changePct } = await computePartnerReportComparison(partnerId, frequency, now);
  const message = await businessReportMessage({
    partnerBusinessName: partner.businessName,
    frequency,
    revenue: formatInr(current.revenue),
    priorRevenue: formatInr(prior.revenue),
    invoiceCount: current.invoiceCount,
    priorInvoiceCount: prior.invoiceCount,
    workorderCount: current.workorderCount,
    priorWorkorderCount: prior.workorderCount,
    changePct,
  });
  const delivered = await sendPartnerTelegramReport(partnerId, frequency, message);

  const when = now.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  const confirmation = delivered
    ? `✅ Your ${FREQUENCY_LABEL[frequency]} business report was sent successfully — ${when}.`
    : `❌ Your ${FREQUENCY_LABEL[frequency]} business report could NOT be delivered today (${when}) — no Telegram chat connected, or the bot was blocked/removed. Reconnect Telegram from Service Centre › Telegram Alerts.`;
  // Best-effort — a confirmation-send hiccup itself never masks/replaces
  // the report delivery outcome already determined above.
  await sendPartnerTelegramAlert(partnerId, "report", confirmation).catch(() => {});

  if (!delivered) {
    throw new Error("Report built but not delivered — no Telegram chat connected, bot blocked, or bot not configured");
  }
}

/**
 * Manual "push report now" (Super Admin, via the Admin app's bridge call) —
 * bypasses shouldSendReportToday/alreadySentToday entirely, since an explicit
 * admin-triggered send is the whole point (unlike the cron, which only fires
 * on a partner's own due day). Scope is either every partner with at least
 * one connected chat (same candidate set the cron reads via
 * listPartnersWithReportsEnabled — routing["report"] === "none" still opts a
 * partner out at send time, inside sendPartnerTelegramReport) or one
 * specific partner regardless of their own routing, since picking a single
 * partner is already an explicit admin choice. lastReportSentAt still gets
 * stamped for this cadence (inside sendPartnerTelegramReport) so a same-day
 * automatic cron run for that partner/cadence treats this as already-sent.
 */
export async function pushTelegramReportsNow(
  frequency: ReportFrequency,
  opts: { partnerId?: string; now?: Date } = {}
): Promise<ReportPushResult> {
  const now = opts.now ?? new Date();
  const details: ReportPushDetail[] = [];

  let targets: { partnerId: string; businessName: string }[];
  if (opts.partnerId) {
    const partner = await getPartner(opts.partnerId);
    if (!partner) throw new Error(`No partner found for id ${opts.partnerId}`);
    targets = [{ partnerId: partner.id, businessName: partner.businessName }];
  } else {
    const candidates = await listPartnersWithReportsEnabled();
    const partners = await Promise.all(candidates.map((c) => getPartner(c.partnerId)));
    targets = candidates
      .map((c, i) => ({ partnerId: c.partnerId, businessName: partners[i]?.businessName }))
      .filter((t): t is { partnerId: string; businessName: string } => Boolean(t.businessName));
  }

  for (const target of targets) {
    try {
      await sendOnePartnerReport(target.partnerId, frequency, now);
      details.push({ partnerId: target.partnerId, businessName: target.businessName, ok: true });
    } catch (err) {
      details.push({
        partnerId: target.partnerId,
        businessName: target.businessName,
        ok: false,
        error: err instanceof Error ? err.message : "Send failed",
      });
    }
  }

  const sent = details.filter((d) => d.ok).length;
  return { cadence: frequency, attempted: details.length, sent, failed: details.length - sent, details };
}

/**
 * Ops digest to the Super Admin's own Telegram (TELEGRAM_OPS_CHAT_ID, NOT
 * any partner's chat) after a report run — automatic cron or manual push —
 * AND the persisted row behind the My Biz Flow Admin app's report-run
 * summary (src/lib/reportRunLog.ts / /api/admin/report-runs). Every
 * report-triggering path funnels through here so "was this run triggered,
 * and did it succeed" has exactly one place it's recorded from.
 *
 * Reports how many partners exist on the whole platform (listPartners, not
 * just the ones with a connected Telegram chat) alongside how many were
 * actually due/attempted for this cadence, and names every partner that
 * didn't get a send with why — not just a bare failed count. Must never
 * throw: a summary-send failure should never break the cron response or the
 * manual push's own success response.
 */
export async function sendReportRunOpsSummary(params: {
  trigger: "cron" | "manual";
  cadence: string;
  details: ReportPushDetail[];
  now?: Date;
}): Promise<void> {
  const sent = params.details.filter((d) => d.ok).length;
  const failed = params.details.filter((d) => !d.ok && !d.skipped).length;
  const skipped = params.details.filter((d) => d.skipped).length;
  const notReceived = params.details.filter((d) => !d.ok);

  try {
    await logReportRun({
      cadence: params.cadence,
      trigger: params.trigger,
      attempted: params.details.length,
      sent,
      failed,
      skipped,
      details: params.details,
    });
  } catch (err) {
    console.error("[sendReportRunOpsSummary] failed to persist run log:", err);
  }

  try {
    const opsChatId = await getOpsChatId();
    if (!opsChatId) return;
    const now = params.now ?? new Date();
    const when = now.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    const totalPartnersOnPlatform = (await listPartners()).length;

    const lines = [
      `📊 Telegram report run (${params.trigger === "manual" ? "manual push" : "cron"})`,
      `Cadence: ${params.cadence}`,
      `Partners on platform: ${totalPartnersOnPlatform} · Considered this run: ${params.details.length}`,
      `Sent: ${sent} · Failed: ${failed} · Skipped: ${skipped}`,
    ];

    if (notReceived.length > 0) {
      lines.push("", "Did not receive:");
      for (const d of notReceived) {
        lines.push(`• ${d.businessName} — ${d.error ?? (d.skipped ? "skipped" : "unknown reason")}`);
      }
    }

    lines.push("", when);
    await sendRawTelegramMessage(opsChatId, lines.join("\n"));
  } catch (err) {
    console.error("[sendReportRunOpsSummary] failed to send Telegram summary:", err);
  }
}
