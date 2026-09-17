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
