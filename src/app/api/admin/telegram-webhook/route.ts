import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { ADMIN_COOKIE_NAME, isValidAdminCookie } from "@/lib/adminAuth";

/**
 * Super-Admin-only server-side Telegram webhook registration/check.
 *
 * Exists so nobody has to type `https://api.telegram.org/bot<TOKEN>/...`
 * into a browser address bar to set this up — that leaves the bot token
 * sitting in browser history/autocomplete. Doing it server-side, gated by
 * the same admin cookie (see src/lib/adminAuth.ts) every other Super Admin
 * check in this repo uses, never exposes TELEGRAM_BOT_TOKEN to the client.
 *
 * GET  -> passthrough of Telegram's own getWebhookInfo (current
 *         registration + last_error_message, if delivery has been failing).
 * POST -> calls setWebhook pointed at this exact request's own origin
 *         (host header), so it can never accidentally register against a
 *         stale/wrong domain — no NEXT_PUBLIC_APP_URL-style env var to keep
 *         in sync as domains change.
 *
 * Not reachable through src/middleware.ts's admin gate (that only redirects
 * /admin/* — see its header comment on Super Admin surfaces having moved to
 * the separate My Biz Flow Admin app; /api/admin/* routes are unaffected),
 * so the admin-cookie check happens directly in this route instead.
 */

async function requireAdmin(): Promise<boolean> {
  const adminCookie = cookies().get(ADMIN_COOKIE_NAME)?.value;
  return isValidAdminCookie(adminCookie);
}

function webhookUrlFor(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}/api/telegram/webhook`;
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: "Super Admin only" }, { status: 403 });
  }

  const token = env.telegramBotToken();
  if (!token) {
    return NextResponse.json({ success: false, error: "TELEGRAM_BOT_TOKEN is not set" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const data = await res.json();
    if (!data.ok) {
      return NextResponse.json({ success: false, error: data.description || "Telegram rejected the request" }, { status: 502 });
    }
    return NextResponse.json({ success: true, info: data.result, expectedUrl: webhookUrlFor(req) });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Failed to reach Telegram" }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: "Super Admin only" }, { status: 403 });
  }

  const token = env.telegramBotToken();
  if (!token) {
    return NextResponse.json({ success: false, error: "TELEGRAM_BOT_TOKEN is not set" }, { status: 400 });
  }
  const secret = env.telegramWebhookSecret();
  if (!secret) {
    return NextResponse.json({ success: false, error: "TELEGRAM_WEBHOOK_SECRET is not set" }, { status: 400 });
  }

  const webhookUrl = webhookUrlFor(req);

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl, secret_token: secret }),
    });
    const data = await res.json();
    if (!data.ok) {
      return NextResponse.json({ success: false, error: data.description || "Telegram rejected the webhook" }, { status: 502 });
    }
    return NextResponse.json({ success: true, webhookUrl, description: data.description });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Failed to reach Telegram" }, { status: 502 });
  }
}
