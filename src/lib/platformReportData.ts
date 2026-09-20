/**
 * The platform's OWN daily/weekly/monthly growth digest — the "us" side of
 * the per-partner business-summary digest in src/lib/telegramReportData.ts.
 * Same cadence machinery (shouldSendReportToday/alreadySentToday/
 * reportPeriodRange), aggregated across every partner instead of scoped to
 * one, and sent to the Super Admin's ops chat instead of a partner's chat.
 * Idempotency stamp lives in PlatformSettings.lastPlatformReportSentAt
 * (src/lib/platformSettings.ts) since there's only one "platform" account,
 * unlike TelegramSettings.lastReportSentAt which is per-partner.
 */
import type { ReportFrequency } from "@/lib/telegramTemplates";
import {
  reportPeriodRange,
  statsForRange,
  formatInr,
  shouldSendReportToday,
  alreadySentToday,
  type PartnerReportStats,
} from "@/lib/telegramReportData";
import { listPartners } from "@/lib/partnerData";
import { getOpsChatId, getLastPlatformReportSentAt, setLastPlatformReportSentAt } from "@/lib/platformSettings";
import { sendRawTelegramMessage } from "@/lib/telegram";
import { logReportRun } from "@/lib/reportRunLog";

export type PlatformReportStats = PartnerReportStats & { activePartners: number; newPartners: number };

/** Aggregates every partner's statsForRange into one platform-wide total, plus how many partners existed/were onboarded in-period. */
async function platformStatsForRange(start: Date, end: Date): Promise<PlatformReportStats> {
  const partners = await listPartners();
  const perPartner = await Promise.all(partners.map((p) => statsForRange(p.id, start, end)));

  const totals = perPartner.reduce(
    (acc, s) => ({
      revenue: acc.revenue + s.revenue,
      invoiceCount: acc.invoiceCount + s.invoiceCount,
      workorderCount: acc.workorderCount + s.workorderCount,
    }),
    { revenue: 0, invoiceCount: 0, workorderCount: 0 }
  );

  const newPartners = partners.filter((p) => p.createdAt && new Date(p.createdAt) >= start && new Date(p.createdAt) < end).length;

  return { ...totals, activePartners: partners.length, newPartners };
}

export type PlatformReportComparison = {
  current: PlatformReportStats;
  prior: PlatformReportStats;
  changePct: string;
};

export async function computePlatformReportComparison(frequency: ReportFrequency, now: Date): Promise<PlatformReportComparison> {
  const { start, end, priorStart, priorEnd } = reportPeriodRange(frequency, now);
  const [current, prior] = await Promise.all([platformStatsForRange(start, end), platformStatsForRange(priorStart, priorEnd)]);
  const changePct = prior.revenue === 0 ? "n/a" : `${(((current.revenue - prior.revenue) / prior.revenue) * 100).toFixed(1)}%`;
  return { current, prior, changePct };
}

const FREQUENCY_LABEL: Record<ReportFrequency, string> = { DAILY: "Daily", WEEKLY: "Weekly", MONTHLY: "Monthly" };

/**
 * Builds and sends the platform's own growth digest to the ops chat, and
 * always logs the attempt to ReportRunLogEntry (cadence tagged
 * "<CADENCE>_PLATFORM" so it's distinguishable from the per-partner runs in
 * the same table) — mirrors sendOnePartnerReport's role, but there is only
 * ever one "target" (the platform itself), so the run/log/notify sequence
 * lives directly in this one function rather than being split the way the
 * per-partner cron loop needs to be.
 */
export async function sendPlatformReport(frequency: ReportFrequency, now: Date, trigger: "cron" | "manual" = "cron"): Promise<void> {
  let ok = true;
  let error: string | undefined;

  try {
    const { current, prior, changePct } = await computePlatformReportComparison(frequency, now);
    const opsChatId = await getOpsChatId();
    if (!opsChatId) throw new Error("No ops chat configured (PlatformSettings.opsChatId / TELEGRAM_OPS_CHAT_ID)");

    const lines = [
      `📈 <b>My Biz Flow — ${FREQUENCY_LABEL[frequency]} Growth Report</b>`,
      "",
      `Active partners: ${current.activePartners}${current.newPartners > 0 ? ` (+${current.newPartners} new)` : ""}`,
      `Revenue: ${formatInr(current.revenue)} (prior: ${formatInr(prior.revenue)}, ${changePct})`,
      `Invoices/bills: ${current.invoiceCount} (prior: ${prior.invoiceCount})`,
      `Workorders/sales: ${current.workorderCount} (prior: ${prior.workorderCount})`,
      "",
      now.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    ];
    await sendRawTelegramMessage(opsChatId, lines.join("\n"));
    await setLastPlatformReportSentAt(frequency, now);
  } catch (err) {
    ok = false;
    error = err instanceof Error ? err.message : "Platform report send failed";
    console.error("[sendPlatformReport] failed:", err);
  }

  await logReportRun({
    cadence: `${frequency}_PLATFORM`,
    trigger,
    attempted: 1,
    sent: ok ? 1 : 0,
    failed: ok ? 0 : 1,
    skipped: 0,
    details: [{ partnerId: "platform", businessName: "My Biz Flow (Platform)", ok, error }],
  });
}

/**
 * Called from the same cron/manual-push paths as the per-partner digest —
 * checks due-today + not-already-sent-today for the platform's own
 * cadence, independent of any partner's own schedule.
 */
export async function maybeSendPlatformReport(
  frequency: ReportFrequency,
  now: Date,
  opts: { force?: boolean; trigger?: "cron" | "manual" } = {}
): Promise<boolean> {
  if (!opts.force) {
    if (!shouldSendReportToday(frequency, now)) return false;
    const lastSent = await getLastPlatformReportSentAt();
    if (alreadySentToday(lastSent[frequency] ?? null, now)) return false;
  }
  await sendPlatformReport(frequency, now, opts.trigger ?? "cron");
  return true;
}
