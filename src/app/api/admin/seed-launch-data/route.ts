import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { seedLaunchData } from "../../../../../scripts/seed-launch-data";

// Same reasoning as api/admin/seed-demo-partner/route.ts: without this,
// Next.js tries to statically prerender this route at build time, which
// calls env.superAdminSecret() before any real request exists.
export const dynamic = "force-dynamic";

/**
 * Remote-trigger equivalent of `npx tsx scripts/seed-launch-data.ts` — for
 * when the operator's own machine/network can't reach the database
 * directly. Runs on Vercel, which already has working DB access.
 *
 * Idempotent (every write in seed-launch-data.ts is an upsert), so safe to
 * hit more than once. Gated by SUPER_ADMIN_SECRET, same as
 * seed-demo-partner — accepts it as `Authorization: Bearer <secret>` or
 * `?key=<secret>`.
 */
export async function GET(req: NextRequest) {
  const expected = env.superAdminSecret();
  if (!expected) {
    return NextResponse.json({ error: "SUPER_ADMIN_SECRET is not set on this deployment" }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization");
  const queryKey = req.nextUrl.searchParams.get("key");
  const provided = authHeader === `Bearer ${expected}` ? expected : queryKey;
  if (provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
      originalLog(...args);
    };
    try {
      await seedLaunchData();
    } finally {
      console.log = originalLog;
    }
    return NextResponse.json({ success: true, log: logs });
  } catch (err) {
    console.error("[api/admin/seed-launch-data] failed:", err);
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
