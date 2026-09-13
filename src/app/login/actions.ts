"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  PARTNER_SESSION_COOKIE,
  PARTNER_SESSION_MAX_AGE_SECONDS,
  createPartnerSessionToken,
} from "@/lib/partnerSession";
import { findPartnerByLoginIdentifier, verifyPartnerPassword } from "@/lib/partnerData";

/**
 * Real partner login: looks a partner up by their public VND#### id OR their
 * registered login contact number (never the internal BIZ###-VND#### key
 * — see partnerData.ts), verifies the password hash, and sets the session
 * cookie to their real partner id. If mustChangePassword is still set
 * (true for every account until their first password change — signup
 * never collects one, see /signup), routes to /change-password instead
 * of the dashboard. Route-level enforcement that a request to
 * /partner/[partnerId]/* actually matches the signed-in cookie doesn't
 * exist yet — this only covers the login handshake itself, same
 * demo-honesty scoping as every other pass in this codebase.
 */
export async function signInAsPartner(formData: FormData) {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const partner = await findPartnerByLoginIdentifier(identifier);
  if (!partner || !(await verifyPartnerPassword(partner.id, password))) {
    redirect("/login?error=invalid_credentials");
  }

  const token = await createPartnerSessionToken(partner.id);
  cookies().set(PARTNER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PARTNER_SESSION_MAX_AGE_SECONDS,
  });

  if (partner.mustChangePassword) {
    redirect("/change-password");
  }

  redirect(`/partner/${partner.id}/dashboard`);
}

/** Clears the partner session cookie and returns to the public login page. */
export async function signOutAction() {
  cookies().delete(PARTNER_SESSION_COOKIE);
  redirect("/login");
}
