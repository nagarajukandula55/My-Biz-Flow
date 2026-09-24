import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createDemoPartner } from "@/lib/demoPartnerSeed";

// Without this, Next.js tries to statically prerender this route at BUILD
// time, which calls env.superAdminSecret() before any real request exists —
// if that var is ever unset for a given build environment, the whole build
// fails instead of just this route erroring per-request like it should.
export const dynamic = "force-dynamic";

/**
 * One-time (idempotent) trigger to create the demo partner directly on the
 * deployed app — for when the operator's own machine/network can't reach
 * the database directly (e.g. a corporate DNS/security policy blocking the
 * DB host) to run scripts/create-demo-partner.ts locally. This route runs
 * on Vercel, which already has working DB access, so it sidesteps that
 * entirely.
 *
 * Gated by SUPER_ADMIN_SECRET — the same secret already required for
 * Super Admin login, so no new secret needs to be created or shared.
 * Accepts it as `Authorization: Bearer <secret>` OR `?key=<secret>` (the
 * query param exists purely so this can be triggered from a plain browser
 * address bar, not just curl — same shared-secret trust level either way).
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
    const result = await createDemoPartner();
    return NextResponse.json({
      success: true,
      alreadyExisted: result.alreadyExisted,
      partnerId: result.partnerId,
      loginContact: result.loginContact,
      password: result.password,
      note: "Log in at /login with the id/password above. Subscription is a 100-year Trial, so every Pro/Ultimate feature is unlocked with no plan/billing setup needed.",
    });
  } catch (err) {
    console.error("[api/admin/seed-demo-partner] failed:", err);
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
