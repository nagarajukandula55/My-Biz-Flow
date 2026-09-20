import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getReportRuns } from "@/lib/reportRunLog";

/**
 * Server-to-server endpoint the separate My Biz Flow Admin app calls to
 * render the report-run summary page — was each scheduled DAILY/WEEKLY/
 * MONTHLY Telegram digest triggered, and did it fully succeed. Backed by
 * ReportRunLogEntry (src/lib/reportRunLog.ts), written from every
 * report-triggering path (cron, manual push) via sendReportRunOpsSummary in
 * src/lib/telegramReportData.ts. Gated by ADMIN_BRIDGE_SECRET, same
 * convention as /api/admin/push-reports.
 */
export async function GET(req: NextRequest) {
  const secret = env.adminServiceSecret();
  if (!secret) {
    return NextResponse.json({ success: false, error: "ADMIN_BRIDGE_SECRET is not set on this deployment" }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 100, 1), 500) : 100;

  try {
    const runs = await getReportRuns(limit);
    return NextResponse.json({ success: true, runs });
  } catch (err) {
    console.error("[api/admin/report-runs] failed:", err);
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Failed to load report runs" }, { status: 500 });
  }
}
