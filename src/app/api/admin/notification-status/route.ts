import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

/**
 * Lets the separate My Biz Flow Admin app show "is this actually
 * configured?" for the notification channels this app owns, instead of an
 * admin only discovering a missing env var when a send silently no-ops
 * (see src/lib/email.ts's sendEmail()/src/lib/telegram.ts's graceful
 * degradation — neither throws when unconfigured). Never returns the
 * secret values themselves, only whether each is set. Gated by
 * ADMIN_BRIDGE_SECRET, same convention as /api/admin/send-partner-email.
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

  return NextResponse.json({
    success: true,
    resendConfigured: Boolean(env.resendApiKey() && env.resendFrom()),
    telegramBotConfigured: Boolean(env.telegramBotToken()),
    telegramWebhookConfigured: Boolean(env.telegramWebhookSecret()),
    cronSecretConfigured: Boolean(env.cronSecret()),
  });
}
