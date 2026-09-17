import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { env } from "@/lib/env";
import { listPartners } from "@/lib/partnerData";
import { sendPartnerTelegramAlert } from "@/lib/telegram";
import { subscriptionExpiringMessage } from "@/lib/telegramTemplates";

const WARNING_DAYS_BEFORE = 3;

function daysUntil(date: Date, now: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / msPerDay);
}

/**
 * Runs daily (see .github/workflows/cron.yml) — there's no automatic
 * recurring subscription billing (payments are recorded manually by a
 * Super Admin, see the Admin app's Subscribers editor), so the only
 * expiry date this app actually tracks is a Trial partner's trialEndAt.
 * Fires a Telegram alert exactly WARNING_DAYS_BEFORE days out and again on
 * the expiry day itself — each fires on exactly one calendar day per
 * partner, so this needs no separate "already sent" dedup flag the way
 * the daily/weekly/monthly report cron does.
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
  const partners = await listPartners();
  let sentCount = 0;

  for (const partner of partners) {
    if (partner.subscriptionStatus !== "Trial" || !partner.trialEndAt) continue;
    const remaining = daysUntil(partner.trialEndAt, now);
    if (remaining !== WARNING_DAYS_BEFORE && remaining !== 0) continue;

    await sendPartnerTelegramAlert(
      partner.id,
      "subscriptionExpiring",
      await subscriptionExpiringMessage({
        partnerBusinessName: partner.businessName,
        expiresOn: partner.trialEndAt.toISOString().slice(0, 10),
        planName: "Trial",
      })
    );
    sentCount += 1;
  }

  return NextResponse.json({ ok: true, partnersConsidered: partners.length, sent: sentCount });
}
