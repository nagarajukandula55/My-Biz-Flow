import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { env } from "@/lib/env";
import { getPartner } from "@/lib/partnerData";
import { listPartnersWithReportsEnabled, sendPartnerTelegramReport } from "@/lib/telegram";
import type { TelegramReportFrequency } from "@/lib/telegram";
import { shouldSendReportToday, alreadySentToday, computePartnerReportComparison } from "@/lib/telegramReportData";
import { businessReportMessage, type ReportFrequency } from "@/lib/telegramTemplates";

function formatInr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

/**
 * Vercel Cron entry point (registered daily in vercel.json) — the piece
 * that was missing: TelegramSettings.reportFrequency (DAILY/WEEKLY/MONTHLY)
 * was saved on the Telegram Alerts page but nothing ever actually computed
 * or sent a digest. Runs once a day; for each partner whose frequency is
 * due today (see shouldSendReportToday — WEEKLY only fires Monday, MONTHLY
 * only the 1st) and hasn't already gotten today's send (alreadySentToday,
 * since Vercel Cron doesn't guarantee exactly-once), computes a real
 * partner-scoped revenue/invoice/workorder summary and sends it to
 * whichever of that partner's chats are connected.
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

  for (const settings of candidates) {
    const frequency = settings.reportFrequency as Exclude<TelegramReportFrequency, "NONE">;
    if (!shouldSendReportToday(frequency, now)) {
      skippedCount += 1;
      continue;
    }
    if (alreadySentToday(settings.lastReportSentAt, now)) {
      skippedCount += 1;
      continue;
    }
    // No chat connected at all -- still worth a no-op skip rather than a
    // wasted computePartnerReportComparison() call (that's real DB work).
    if (!settings.chatId && !settings.groupChatId) {
      skippedCount += 1;
      continue;
    }

    const partner = await getPartner(settings.partnerId);
    if (!partner) {
      skippedCount += 1;
      continue;
    }

    const { current, prior, changePct } = await computePartnerReportComparison(settings.partnerId, frequency as ReportFrequency, now);
    const message = await businessReportMessage({
      partnerBusinessName: partner.businessName,
      frequency: frequency as ReportFrequency,
      revenue: formatInr(current.revenue),
      priorRevenue: formatInr(prior.revenue),
      invoiceCount: current.invoiceCount,
      priorInvoiceCount: prior.invoiceCount,
      workorderCount: current.workorderCount,
      priorWorkorderCount: prior.workorderCount,
      changePct,
    });

    await sendPartnerTelegramReport(settings.partnerId, message);
    sentCount += 1;
  }

  return NextResponse.json({ ok: true, partnersConsidered: candidates.length, sent: sentCount, skipped: skippedCount });
}
