import { NextResponse } from "next/server";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { env, telegramLoginConfigured } from "@/lib/env";
import { findPartnerIdByChatId } from "@/lib/telegram";
import { getPartner } from "@/lib/partnerData";
import { completePartnerLogin } from "@/lib/completePartnerLogin";

/**
 * Telegram Login Widget callback. The widget (src/app/login/page.tsx) posts
 * the payload Telegram handed it in the browser here; this route MUST
 * verify `hash` per Telegram's documented algorithm before trusting
 * anything in it — see verifyTelegramAuth below. Reuses the existing
 * findPartnerIdByChatId() reverse lookup: for a private 1:1 chat, the
 * widget's `id` field IS the same Telegram user id a partner already
 * connects as TelegramSettings.chatId for notifications, so no schema
 * change is needed.
 */
export type TelegramWidgetPayload = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60; // ~1 day — rejects replay of an old captured payload

/**
 * Telegram's documented verification (https://core.telegram.org/widgets/login#checking-authorization):
 * 1. Take every field of the payload except `hash`.
 * 2. Build the "data-check-string": each remaining field as `key=value`,
 *    sorted alphabetically by key, joined with `\n`.
 * 3. Compute `secret_key = SHA256(bot_token)`.
 * 4. Compute `HMAC-SHA256(data-check-string, secret_key)` (secret_key as the
 *    HMAC key) and hex-encode it.
 * 5. The payload is genuine only if that hex digest exactly equals the
 *    payload's own `hash` field (constant-time compared, not `===`, so a
 *    timing side-channel can't help an attacker guess it byte by byte).
 * Also rejects a payload whose `auth_date` is older than
 * MAX_AUTH_AGE_SECONDS, per Telegram's own recommendation, so a captured
 * old payload can't be replayed indefinitely.
 */
function verifyTelegramAuth(payload: Record<string, unknown>, botToken: string): boolean {
  const { hash, ...rest } = payload;
  if (typeof hash !== "string" || !hash) return false;

  const authDate = Number(rest.auth_date);
  if (!Number.isFinite(authDate)) return false;
  const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
  if (ageSeconds > MAX_AUTH_AGE_SECONDS || ageSeconds < -60) return false; // small clock-skew allowance, not a wide-open future date

  const dataCheckString = Object.keys(rest)
    .filter((key) => rest[key] !== undefined && rest[key] !== null)
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join("\n");

  const secretKey = createHash("sha256").update(botToken).digest();
  const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const a = Buffer.from(computedHash, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!telegramLoginConfigured()) {
    return NextResponse.json({ error: "Telegram login is not configured" }, { status: 503 });
  }

  let payload: TelegramWidgetPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const botToken = env.telegramBotToken();
  if (!botToken) {
    return NextResponse.json({ error: "Telegram login is not configured" }, { status: 503 });
  }

  if (!payload || typeof payload.id !== "number" || !verifyTelegramAuth(payload as unknown as Record<string, unknown>, botToken)) {
    return NextResponse.json({ error: "Invalid Telegram authentication payload" }, { status: 401 });
  }

  const partnerId = await findPartnerIdByChatId(String(payload.id));
  if (!partnerId) {
    return NextResponse.json({ redirect: "/login?error=telegram_not_connected" });
  }

  const partner = await getPartner(partnerId);
  if (!partner) {
    return NextResponse.json({ redirect: "/login?error=telegram_not_connected" });
  }

  const result = await completePartnerLogin(partner);
  if (!result.ok) {
    return NextResponse.json({ redirect: "/login?error=server_misconfigured" });
  }
  return NextResponse.json({ redirect: result.redirectPath });
}
