import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { env } from "@/lib/env";
import { isWithinReportWindow, isPastFinalCatchupDeadline } from "@/lib/telegramReportData";
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

  const result = await runTelegramReportsNow(now, "cron");

  return NextResponse.json({ ok: true, ...result });
}
