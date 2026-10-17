"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  PARTNER_SESSION_COOKIE,
  PARTNER_SESSION_MAX_AGE_SECONDS,
  createPartnerSessionToken,
} from "@/lib/partnerSession";
import { findPartnerByLoginIdentifier, verifyPartnerPassword } from "@/lib/partnerData";
import { getPartnerHomePath } from "@/lib/partnerHome";
import { prisma } from "@/lib/prisma";
import { requestLoginOtp, verifyLoginOtp } from "@/lib/whatsappOtp";
import { isOtpLoginEnabledForPartner } from "@/lib/telecalling/whatsappGate";

/**
 * Real partner login — universal across every business type. There is one
 * login form for the whole platform: it looks a partner up by their public
 * <PREFIX>#### id (SC0001, FF0001, VND0001, ...) OR their registered login
 * contact number (never the internal BIZ###-<PREFIX>#### key — see
 * partnerData.ts), verifies the password hash, and sets the session cookie
 * to their real partner id.
 *
 * Where the signed-in partner LANDS depends on their business type, not a
 * single hardcoded dashboard: an SC#### id (Service Centre) lands in the
 * Service Centre module, an FF#### id (Field Force) lands in Field Force,
 * and so on for every type the Designer's PartnerType.defaultModules
 * config lists — see getPartnerHomePath(). This is also the ONLY login for
 * a module like Service Centre: there is no separate staff sign-in for
 * that module anymore (a single business logs in once; every user of that
 * business shares this one login), so this same path already covers what
 * a "Service Centre login" needs to do.
 *
 * If mustChangePassword is still set (true for every account until their
 * first password change — signup never collects one, see /signup), routes
 * to /change-password instead of the module home; that flow computes and
 * redirects to the same module home once the password is set.
 */
export async function signInAsPartner(formData: FormData) {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const partner = await findPartnerByLoginIdentifier(identifier);
  if (!partner || !(await verifyPartnerPassword(partner.id, password))) {
    redirect("/login?error=invalid_credentials");
  }

  // If PARTNER_SESSION_SECRET is misconfigured (unset/misnamed), this
  // throws -- previously unguarded, so a real partner logging in with
  // valid credentials got a raw 500 instead of a page that says what's
  // actually wrong. This is the ONE place that's ever hit for a genuine
  // partner login (viewing partner pages as Super Admin bypasses session
  // verification entirely — see requirePartnerSession.ts — so that path
  // never surfaced a missing secret).
  let token: string;
  try {
    token = await createPartnerSessionToken(partner.id);
  } catch {
    redirect("/login?error=server_misconfigured");
  }
  cookies().set(PARTNER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PARTNER_SESSION_MAX_AGE_SECONDS,
  });

  await prisma.partner.update({ where: { id: partner.id }, data: { lastLoginAt: new Date() } });

  if (partner.mustChangePassword) {
    redirect("/change-password");
  }

  redirect(await getPartnerHomePath(partner));
}

/** Clears the partner session cookie and returns to the public login page. */
export async function signOutAction() {
  cookies().delete(PARTNER_SESSION_COOKIE);
  redirect("/login");
}

/**
 * Step 1 of WhatsApp OTP login — a second login METHOD alongside
 * password/Google/Telegram above, not a replacement for any of them (see
 * WhatsAppOtpLoginForm.tsx, rendered next to the password form on
 * /login). Looks the phone up the same way the password form does
 * (findPartnerByLoginIdentifier), then sends a code via requestLoginOtp.
 * Deliberately returns `{ ok: true }` even when no partner matches this
 * number, AND when a partner matches but Super Admin hasn't enabled OTP
 * login for them yet (PartnerWhatsAppMessaging.otpLoginEnabled) — same
 * "don't confirm whether an account exists" posture as any login-adjacent
 * lookup — so the UI always just says "code sent" and lets step 2's
 * verify fail generically instead.
 */
export async function requestPartnerWhatsAppOtpAction(phone: string): Promise<{ ok: boolean; error?: string }> {
  const trimmed = phone.trim();
  if (!trimmed) return { ok: false, error: "Enter your registered WhatsApp number." };

  const partner = await findPartnerByLoginIdentifier(trimmed);
  if (!partner) return { ok: true };
  if (!(await isOtpLoginEnabledForPartner(partner.id))) return { ok: true };

  const result = await requestLoginOtp(partner.id, "partner-login", partner.id, trimmed);
  if (!result.sent) {
    return {
      ok: false,
      error:
        result.reason === "not_configured"
          ? "WhatsApp OTP login isn't available right now."
          : "Couldn't send the code — check the number and try again.",
    };
  }
  return { ok: true };
}

/**
 * Step 2 of WhatsApp OTP login — verifies the code and, on success, signs
 * the partner in exactly like signInAsPartner above (same session cookie,
 * same lastLoginAt stamp, same mustChangePassword/home-path redirect).
 */
export async function verifyPartnerWhatsAppOtpAction(phone: string, code: string): Promise<void | { error?: string }> {
  const partner = await findPartnerByLoginIdentifier(phone.trim());
  if (!partner) return { error: "Incorrect or expired code." };

  const result = await verifyLoginOtp(partner.id, "partner-login", partner.id, code);
  if (!result.verified) return { error: "Incorrect or expired code." };

  let token: string;
  try {
    token = await createPartnerSessionToken(partner.id);
  } catch {
    return { error: "Sign-in is temporarily unavailable due to a server configuration issue." };
  }
  cookies().set(PARTNER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PARTNER_SESSION_MAX_AGE_SECONDS,
  });

  await prisma.partner.update({ where: { id: partner.id }, data: { lastLoginAt: new Date() } });

  if (partner.mustChangePassword) redirect("/change-password");
  redirect(await getPartnerHomePath(partner));
}
