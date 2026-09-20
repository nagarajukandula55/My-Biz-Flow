import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { pushTelegramReportsNow, sendReportRunOpsSummary } from "@/lib/telegramReportData";
import { sendPlatformReport } from "@/lib/platformReportData";
import type { ReportFrequency } from "@/lib/telegramTemplates";

const CADENCES: ReportFrequency[] = ["DAILY", "WEEKLY", "MONTHLY"];

/**
 * Server-to-server endpoint the separate My Biz Flow Admin app calls to
 * manually push a Telegram business-report digest right now, instead of
 * waiting for the scheduled cron (/api/cron/telegram-reports). Reuses the
 * same send sequence that cron uses (src/lib/telegramReportData.ts's
 * sendOnePartnerReport, via pushTelegramReportsNow) rather than
 * duplicating it. Gated by ADMIN_BRIDGE_SECRET, same convention as
 * /api/admin/send-partner-email.
 */
export async function POST(req: NextRequest) {
  const secret = env.adminServiceSecret();
  if (!secret) {
    return NextResponse.json({ success: false, error: "ADMIN_BRIDGE_SECRET is not set on this deployment" }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const cadence = payload?.cadence;
  const partnerId: string | undefined = typeof payload?.partnerId === "string" && payload.partnerId ? payload.partnerId : undefined;
  // scope: "partners" (default) pushes each partner's own digest; "platform"
  // instead pushes the platform's own growth digest (src/lib/platformReportData.ts)
  // to the ops chat — partnerId is ignored for that scope, there's only one target.
  const scope: "partners" | "platform" = payload?.scope === "platform" ? "platform" : "partners";

  const cadencesToRun: ReportFrequency[] = cadence === "ALL" ? CADENCES : CADENCES.includes(cadence) ? [cadence] : [];
  if (cadencesToRun.length === 0) {
    return NextResponse.json({ success: false, error: "cadence must be DAILY, WEEKLY, MONTHLY, or ALL" }, { status: 400 });
  }

  if (scope === "platform") {
    try {
      for (const c of cadencesToRun) {
        await sendPlatformReport(c, new Date(), "manual");
      }
      return NextResponse.json({ success: true, scope, cadencesRun: cadencesToRun });
    } catch (err) {
      console.error("[api/admin/push-reports] platform push failed:", err);
      return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Push failed" }, { status: 500 });
    }
  }

  try {
    const results = [];
    let totalAttempted = 0;
    let totalSent = 0;
    let totalFailed = 0;
    for (const c of cadencesToRun) {
      const result = await pushTelegramReportsNow(c, { partnerId });
      results.push(result);
      totalAttempted += result.attempted;
      totalSent += result.sent;
      totalFailed += result.failed;

      await sendReportRunOpsSummary({ trigger: "manual", cadence: c, details: result.details });
    }

    return NextResponse.json({ success: true, results, totalAttempted, totalSent, totalFailed });
  } catch (err) {
    console.error("[api/admin/push-reports] failed:", err);
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Push failed" }, { status: 500 });
  }
}
