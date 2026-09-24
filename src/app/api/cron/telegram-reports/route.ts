import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { env } from "@/lib/env";
import { listPartnersWithReportsEnabled, TELEGRAM_REPORT_CADENCES, type TelegramReportCadence } from "@/lib/telegram";
import { getPartner } from "@/lib/partnerData";
import {
  shouldSendReportToday,
  alreadySentToday,
  isWithinReportWindow,
  isPastFinalCatchupDeadline,
  sendOnePartnerReport,
  sendReportRunOpsSummary,
  type ReportPushDetail,
} from "@/lib/telegramReportData";
import { maybeSendPlatformReport } from "@/lib/platformReportData";

/**
 * GitHub Actions cron entry point (.github/workflows/cron.yml, 9 PM IST
 * daily) — the piece that was missing: nothing ever actually computed or
 * sent a digest. Runs once a day; every partner with at least one connected
 * chat (listPartnersWithReportsEnabled) is checked against each of the
 * three cadences independently (DAILY/WEEKLY/MONTHLY now fire on their own
 * schedule per partner — see TELEGRAM_REPORT_CADENCES/lastReportSentAt in
 * src/lib/telegram.ts, no more single opt-in frequency): due today (see
 * shouldSendReportToday — WEEKLY only fires Saturday, MONTHLY only the last
 * day of the month) and not already sent today for that cadence
 * (alreadySentToday, since this workflow doesn't guarantee exactly-once)
 * gets a real partner-scoped revenue/invoice/workorder summary sent to
 * whichever connected chat(s) routing["report"] resolves to. The actual
 * comparison/template/send sequence lives in sendOnePartnerReport
 * (src/lib/telegramReportData.ts), shared with the Super Admin's manual
 * "push report now" bridge (/api/admin/push-reports).
 */
export async function GET(request: Request) {
  const secret = env.cronSecret();
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();

  // GitHub Actions now triggers this endpoint every 15 min through the
  // evening (see .github/workflows/cron.yml) since its `schedule` trigger
  // is best-effort and can land late by anywhere from minutes to hours, or
  // be skipped some days entirely. Normally only send inside the 9 PM IST
  // window; other invocations are a cheap no-op. But from 23:15 IST onward,
  // send regardless of window — alreadySentToday still makes this a no-op
  // for anything that DID go out earlier, so this only fires for a cadence
  // the window's runs all missed, which is exactly what let reports go
  // silently unsent for days at a time.
  const inWindow = isWithinReportWindow(now);
  const catchUp = isPastFinalCatchupDeadline(now);
  if (!inWindow && !catchUp) {
    return NextResponse.json({ ok: true, skipped: "Outside 9 PM IST report window" });
  }

  const candidates = await listPartnersWithReportsEnabled();

  // One details[] per cadence — each cadence is its own "run" (its own due
  // day), so a WEEKLY run on an off-day shouldn't blend into DAILY's summary.
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

    // Only log/notify a cadence that actually had at least one partner due
    // today — a WEEKLY run on a Tuesday would otherwise post an all-skipped
    // summary to ops every single day for nothing.
    if (dueDetails.length > 0) {
      await sendReportRunOpsSummary({ trigger: "cron", cadence, details, now });
    }
  }

  // The platform's own growth digest — same three cadences, independent of
  // any partner's schedule, sent to the ops chat (see platformReportData.ts).
  for (const cadence of TELEGRAM_REPORT_CADENCES) {
    await maybeSendPlatformReport(cadence, now, { trigger: "cron" });
  }

  return NextResponse.json({ ok: true, partnersConsidered: candidates.length, sent: sentCount, failed: failedCount, skipped: skippedCount });
}
