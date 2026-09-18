import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { sendPasswordResetEmail, sendPlatformSubscriptionPaymentEmail, sendPartnerWelcomeEmail } from "@/lib/email";
import {
  sendAdminIssuedCredentialsEmail,
  sendPartnerApprovedEmail,
  sendPartnerRejectedEmail,
  sendPartnerApplicationReceivedEmail,
} from "@/lib/email/partnerEmails";
import { findPartnerForPasswordReset } from "@/lib/partnerData";
import { createPasswordResetToken } from "@/lib/partnerSession";
import { SITE_URL } from "@/lib/seo";
import { sendPartnerTelegramAlert } from "@/lib/telegram";
import { paymentReceivedMessage } from "@/lib/telegramTemplates";

/**
 * Server-to-server endpoint the separate My Biz Flow Admin app calls to
 * actually dispatch a partner-facing transactional email. Resend is only
 * ever called from THIS app (see src/lib/email.ts) — the Admin app edits
 * the shared EmailTemplate table (both repos read the same rows) but never
 * holds a Resend client itself, so all partner communication funnels
 * through one sender. Gated by ADMIN_BRIDGE_SECRET, same shared-secret
 * convention as CRON_SECRET/TELEGRAM_WEBHOOK_SECRET.
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
  if (!payload || typeof payload.type !== "string") {
    return NextResponse.json({ success: false, error: "Missing type" }, { status: 400 });
  }

  try {
    switch (payload.type) {
      case "admin_issued_credentials": {
        const { to, name, tempPassword } = payload;
        if (!to || !name || !tempPassword) return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
        const result = await sendAdminIssuedCredentialsEmail({ to, name, tempPassword });
        return NextResponse.json({ success: true, sent: result.sent });
      }
      case "platform_subscription_payment": {
        const { to, businessName, planName, amount, billingCycle, invoiceNumber, partnerId } = payload;
        if (!to || !businessName || !planName || !amount || !billingCycle || !invoiceNumber) {
          return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
        }
        const result = await sendPlatformSubscriptionPaymentEmail({ to, businessName, planName, amount, billingCycle, invoiceNumber });
        // Also nudge the partner's connected Telegram chat, if any — same
        // event, second channel. Best-effort: sendPartnerTelegramAlert never
        // throws when no chat is connected.
        if (partnerId) {
          await sendPartnerTelegramAlert(
            partnerId,
            "paymentReceived",
            await paymentReceivedMessage({ partnerBusinessName: businessName, amount, planName })
          );
        }
        return NextResponse.json({ success: true, sent: result.sent });
      }
      case "password_reset": {
        const { to, resetUrl } = payload;
        if (!to || !resetUrl) return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
        const result = await sendPasswordResetEmail({ to, resetUrl });
        return NextResponse.json({ success: true, sent: result.sent });
      }
      // Mints the reset token AND sends here (rather than accepting an
      // already-minted token) so the Admin app's mirrored /forgot-password
      // route never needs its own copy of PARTNER_SESSION_SECRET to stay in
      // sync with — one deployment owns the whole token lifecycle.
      case "request_password_reset": {
        const { identifier } = payload;
        if (!identifier) return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
        const partner = await findPartnerForPasswordReset(identifier);
        if (partner) {
          const token = await createPasswordResetToken(partner.id);
          const resetUrl = `${SITE_URL}/reset-password?token=${encodeURIComponent(token)}`;
          await sendPasswordResetEmail({ to: partner.businessEmail, resetUrl });
        }
        // Always success, whether or not a partner matched — same
        // no-account-existence-leak posture as the partner app's own
        // /forgot-password action.
        return NextResponse.json({ success: true, sent: true });
      }
      case "partner_approved": {
        const { to, businessName, partnerId } = payload;
        if (!to || !businessName || !partnerId) return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
        const result = await sendPartnerApprovedEmail({ to, businessName, partnerId });
        return NextResponse.json({ success: true, sent: result.sent });
      }
      case "partner_rejected": {
        const { to, businessName, reason } = payload;
        if (!to || !businessName) return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
        const result = await sendPartnerRejectedEmail({ to, businessName, reason });
        return NextResponse.json({ success: true, sent: result.sent });
      }
      case "partner_welcome": {
        const { to, businessName, partnerId } = payload;
        if (!to || !businessName || !partnerId) return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
        const result = await sendPartnerWelcomeEmail({ to, businessName, partnerId });
        return NextResponse.json({ success: true, sent: result.sent });
      }
      case "partner_application_received": {
        const { to, businessName } = payload;
        if (!to || !businessName) return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
        const result = await sendPartnerApplicationReceivedEmail({ to, businessName });
        return NextResponse.json({ success: true, sent: result.sent });
      }
      default:
        return NextResponse.json({ success: false, error: `Unknown type: ${payload.type}` }, { status: 400 });
    }
  } catch (err) {
    console.error("[api/admin/send-partner-email] failed:", err);
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Send failed" }, { status: 500 });
  }
}
