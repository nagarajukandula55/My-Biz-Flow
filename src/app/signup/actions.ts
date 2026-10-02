"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createPartner } from "@/lib/partnerData";
import { getPartnerType } from "@/lib/designer/partnerTypesData";
import { resolveReferrer } from "@/lib/referrals";
import { sendPartnerWelcomeEmail } from "@/lib/email";
import {
  PARTNER_SESSION_COOKIE,
  PARTNER_SESSION_MAX_AGE_SECONDS,
  createPartnerSessionToken,
} from "@/lib/partnerSession";

/**
 * Real "register your business" action. No password is collected here — one
 * is generated internally and never shown; the new partner is signed
 * straight into a real session and redirected to /change-password to set
 * their own, so there's no generated password to copy/type anywhere.
 *
 * Every Partner Type signs up directly now — the PartnerSignupRequest
 * admin-approval gate (src/lib/partnerSignupRequestsData.ts) is
 * deliberately bypassed here for the time being, regardless of a given
 * PartnerType's own `requiresApproval` flag, so no signup (including
 * referral-driven ones) gets stuck in a pending queue. The approval code
 * path itself is left in place, unused, in case a specific partner type
 * needs it reinstated later — re-add the `if (partnerType?.requiresApproval)`
 * branch to bring it back for that type.
 */
export async function registerBusiness(formData: FormData) {
  const partnerTypeId = String(formData.get("partnerTypeId") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();
  const addressLine = String(formData.get("addressLine") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const pincode = String(formData.get("pincode") ?? "").trim();
  const gstin = String(formData.get("gstin") ?? "").trim();
  const businessEmail = String(formData.get("businessEmail") ?? "").trim();
  const businessContact = String(formData.get("businessContact") ?? "").trim();
  const loginContact = String(formData.get("loginContact") ?? "").trim();
  const referralCode = String(formData.get("referralCode") ?? "").trim();
  // Multi-select checkboxes — every ticked box posts under the same name.
  // Left unvalidated here on purpose: parseProductDomains() (partnerData)
  // drops anything unknown and falls back to ELECTRONICS if nothing was
  // ticked, so the signup can never be blocked on it.
  const productDomains = formData.getAll("productDomains").map((v) => String(v));

  if (!partnerTypeId || !businessName || !city || !state || !pincode || !businessEmail || !businessContact || !loginContact) {
    throw new Error("Missing required signup fields");
  }

  const partnerType = await getPartnerType(partnerTypeId);

  // Server-side validation for this type's own custom signup fields — the
  // form marks required ones with the `required` attribute, but that's
  // client-side only, so re-check here from the PartnerType's own
  // customSignupFields rather than trusting the submitted set of names.
  const customFieldValues: Record<string, string> = {};
  for (const field of partnerType?.customSignupFields ?? []) {
    const value = String(formData.get(`custom_${field.key}`) ?? "").trim();
    if (field.required && !value) {
      throw new Error(`Missing required field: ${field.label}`);
    }
    if (value) customFieldValues[field.key] = value;
  }

  // No self-referral, no fabricated match — an unknown/malformed code
  // simply resolves to undefined and the signup proceeds as organic. The
  // code may name either a referring Partner (REF-<id>) or a telecalling
  // agent (their loginId, e.g. "AGT001") — see resolveReferrer.
  const referrer = referralCode ? await resolveReferrer(referralCode) : undefined;
  const input = {
    partnerTypeId,
    businessName,
    addressLine,
    city,
    state,
    pincode,
    gstin,
    businessEmail,
    businessContact,
    loginContact,
    productDomains,
    customFieldValues,
    referredByPartnerId: referrer?.type === "PARTNER" ? referrer.id : undefined,
    referredByStaffId: referrer?.type === "STAFF" ? referrer.id : undefined,
  };

  let partnerId: string;
  try {
    const result = await createPartner(input);
    partnerId = result.partner.id;
    // result.password is a real password (hashed and stored, needed so
    // this account works with /login on another device), but it's
    // intentionally never shown or emailed — the visitor is auto-signed-in
    // below straight into setting their own password.
  } catch {
    redirect(`/signup/${encodeURIComponent(partnerTypeId)}?error=contact_taken`);
  }

  // Best-effort — sendPartnerWelcomeEmail never throws — but awaited
  // (rather than fire-and-forget) since redirect() below throws to
  // navigate, and a serverless function invocation can end before a
  // dangling background promise completes.
  await sendPartnerWelcomeEmail({ to: businessEmail, businessName, partnerId });

  // No password field at signup, so there's nothing for the visitor to
  // type in to "log in" right after registering — sign them straight into
  // a real session (same token issuance as a normal login) and land them
  // on the forced first-time password screen directly, instead of
  // surfacing the generated password on-screen for them to copy and then
  // separately visit /login with it.
  // The partner account itself is already created by this point (row
  // inserted, welcome email sent) -- if session-token creation fails (e.g.
  // PARTNER_SESSION_SECRET misconfigured), send them to /login instead of
  // a raw 500; their account still exists, they can sign in once it's
  // fixed. See login/actions.ts's matching guard for why this path was
  // previously unguarded and never noticed (Super Admin's view-any-partner
  // bypass never exercises real partner-session signing).
  let token: string;
  try {
    token = await createPartnerSessionToken(partnerId);
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

  redirect("/change-password?welcome=1");
}
