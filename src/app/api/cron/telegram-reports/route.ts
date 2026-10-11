import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { isAuthorizedCronRequest } from "@/lib/cronAuthorization";
import { env } from "@/lib/env";
import { isWithinReportWindow } from "@/lib/telegramReportData";
import { runTelegramReportsNow } from "@/lib/telegramReportRunner";

/**
 * GitHub Actions cron entry point (.github/workflows/cron.yml, 9 PM IST
 * daily) — the piece that was missing: nothing ever actually computed or
 * sent a digest. Runs once a day; every partner with at least one connected
 * chat is checked against each of the three cadences independently
 * (DAILY/WEEKLY/MONTHLY fire on their own schedule per partner — see
 * TELEGRAM_REPORT_CADENCES/lastReportSentAt in src/lib/telegram.ts, no more
 * single opt-in frequency): due today (shouldSendReportToday — WEEKLY only
 * fires Saturday, MONTHLY only the last day of the month) and not already
 * sent today for that cadence (alreadySentToday, since this workflow
 * doesn't guarantee exactly-once) gets a real partner-scoped
 * revenue/invoice/workorder summary sent to whichever connected chat(s)
 * routing["report"] resolves to.
 *
 * The actual candidate loop / idempotency / comparison / template / send
 * sequence lives in runTelegramReportsNow (src/lib/telegramReportRunner.ts),
 * which is the ONE real implementation — shared with the Super Admin's
 * manual "push report now" bridge (/api/admin/push-reports) and with the
 * on-demand `/sendreport` Telegram command (src/app/api/telegram/webhook/
 * route.ts), added as a manual backup since GitHub Actions' own `schedule`
 * trigger for this endpoint has been observed to drop most of its daily
 * firings.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), env.cronSecret())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // GitHub Actions now triggers this endpoint every 10-15 min through the
  // evening and overnight (see .github/workflows/cron.yml) since its
  // `schedule` trigger is best-effort and has been observed landing as
  // late as ~01:47 IST the next calendar day for a run meant to fire at
  // 20:30-23:00 IST. isWithinReportWindow() now covers the whole observed
  // drift range (20:30 IST -> 06:00 IST next day) as one window, with
  // shouldSendReportToday/alreadySentToday resolving a late-landing run
  // back to the correct business day — see reportDay() in
  // telegramReportData.ts. Invocations outside that window are a cheap
  // no-op; alreadySentToday makes repeated in-window firings a no-op too.
  if (!isWithinReportWindow(now)) {
    return NextResponse.json({ ok: true, skipped: "Outside 20:30 IST - 06:00 IST report window" });
  }

  const result = await runTelegramReportsNow(now, "cron");

  return NextResponse.json({ ok: true, ...result });
}
