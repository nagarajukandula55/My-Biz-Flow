/**
 * The one real implementation behind "send today's Telegram partner
 * reports" — every partner with reports enabled, checked against each
 * cadence (DAILY/WEEKLY/MONTHLY), due-today + not-already-sent-today
 * filtered, sent via sendOnePartnerReport, plus the platform's own growth
 * digest. Originally inlined in the cron route
 * (src/app/api/cron/telegram-reports/route.ts); pulled out here so the
 * manual Telegram `/sendreport` command (src/app/api/telegram/webhook/
 * route.ts) can trigger the exact same run on demand, from the ops chat,
 * without duplicating the loop/idempotency logic. Both callers share this
 * one function — there is no second copy of the send sequence.
 */
import {
  listPartnersWithReportsEnabled,
  TELEGRAM_REPORT_CADENCES,
  type TelegramReportCadence,
} from "@/lib/telegram";
import { getPartner } from "@/lib/partnerData";
import {
  shouldSendReportToday,
  alreadySentToday,
  sendOnePartnerReport,
  sendReportRunOpsSummary,
  type ReportPushDetail,
} from "@/lib/telegramReportData";
import { maybeSendPlatformReport } from "@/lib/platformReportData";

export type TelegramReportRunResult = {
  partnersConsidered: number;
  sent: number;
  failed: number;
  skipped: number;
};

/**
 * Runs every due partner report (all three cadences) plus the platform
 * growth digest for `now`, exactly once. `trigger` is only used for the ops
 * summary/report-run-log labelling ("cron" vs "manual") — the send/
 * idempotency logic itself doesn't change based on who triggered it, since
 * alreadySentToday is what actually prevents a duplicate send within a
 * calendar day regardless of trigger.
 */
export async function runTelegramReportsNow(
  now: Date,
  trigger: "cron" | "manual"
): Promise<TelegramReportRunResult> {
  const candidates = await listPartnersWithReportsEnabled();

  const detailsByCadence = new Map<TelegramReportCadence, ReportPushDetail[]>(
    TELEGRAM_REPORT_CADENCES.map((c) => [c, []])
  );

  for (const settings of candidates) {
    const partner = await getPartner(settings.partnerId);
    const businessName = partner?.businessName ?? settings.partnerId;

    for (const cadence of TELEGRAM_REPORT_CADENCES) {
      const details = detailsByCadence.get(cadence)!;

      if (!shouldSendReportToday(cadence, now)) {
        details.push({ partnerId: settings.partnerId, businessName, ok: false, skipped: true, error: "Not due today for this cadence" });
        continue;
      }
      if (alreadySentToday(settings.lastReportSentAt[cadence] ?? null, now)) {
        details.push({ partnerId: settings.partnerId, businessName, ok: false, skipped: true, error: "Already sent today" });
        continue;
      }

      try {
        await sendOnePartnerReport(settings.partnerId, cadence, now);
        details.push({ partnerId: settings.partnerId, businessName, ok: true });
      } catch (err) {
        details.push({ partnerId: settings.partnerId, businessName, ok: false, error: err instanceof Error ? err.message : "Send failed" });
      }
    }
  }

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  for (const [cadence, details] of detailsByCadence) {
    const dueDetails = details.filter((d) => !d.skipped);
    sentCount += dueDetails.filter((d) => d.ok).length;
    failedCount += dueDetails.filter((d) => !d.ok).length;
    skippedCount += details.filter((d) => d.skipped).length;

    if (dueDetails.length > 0) {
      await sendReportRunOpsSummary({ trigger, cadence, details, now });
    }
  }

  for (const cadence of TELEGRAM_REPORT_CADENCES) {
    await maybeSendPlatformReport(cadence, now, { trigger });
  }

  return { partnersConsidered: candidates.length, sent: sentCount, failed: failedCount, skipped: skippedCount };
}
