import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { env } from "@/lib/env";
import { listPartnersWithReportsEnabled, TELEGRAM_REPORT_CADENCES } from "@/lib/telegram";
import { shouldSendReportToday, alreadySentToday, sendOnePartnerReport, sendReportRunOpsSummary } from "@/lib/telegramReportData";

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
  const candidates = await listPartnersWithReportsEnabled();
  let sentCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const cadencesRun = new Set<string>();

  for (const settings of candidates) {
    for (const cadence of TELEGRAM_REPORT_CADENCES) {
      if (!shouldSendReportToday(cadence, now)) {
        skippedCount += 1;
        continue;
      }
      if (alreadySentToday(settings.lastReportSentAt[cadence] ?? null, now)) {
        skippedCount += 1;
        continue;
      }

      try {
        await sendOnePartnerReport(settings.partnerId, cadence, now);
        sentCount += 1;
        cadencesRun.add(cadence);
      } catch {
        failedCount += 1;
      }
    }
  }

  if (sentCount > 0 || failedCount > 0) {
    await sendReportRunOpsSummary({
      trigger: "cron",
      cadence: cadencesRun.size > 0 ? Array.from(cadencesRun).join(", ") : "—",
      attempted: sentCount + failedCount,
      sent: sentCount,
      failed: failedCount,
      now,
    });
  }

  return NextResponse.json({ ok: true, partnersConsidered: candidates.length, sent: sentCount, failed: failedCount, skipped: skippedCount });
}
