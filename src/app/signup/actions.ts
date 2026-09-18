"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createPartner } from "@/lib/partnerData";
import { createSignupRequest } from "@/lib/partnerSignupRequestsData";
import { getPartnerType } from "@/lib/designer/partnerTypesData";
import { partnerIdFromReferralCode } from "@/lib/referrals";
import { sendPartnerWelcomeEmail } from "@/lib/email";
import { sendPartnerApplicationReceivedEmail } from "@/lib/email/partnerEmails";
import { sendRawTelegramMessage } from "@/lib/telegram";
import { newPartnerApplicationMessage } from "@/lib/telegramTemplates";
import { getOpsChatId } from "@/lib/platformSettings";
import {
  PARTNER_SESSION_COOKIE,
  PARTNER_SESSION_MAX_AGE_SECONDS,
  createPartnerSessionToken,
} from "@/lib/partnerSession";

/**
 * Real "register your business" action. No password is collected here — one
 * is generated internally and never shown; the new partner is signed
 * straight into a real session and redirected to /change-password to set
 * their own, so there's no generated password to copy/type anywhere. If the
 * chosen Partner Type has requiresApproval on, this creates a
 * PartnerSignupRequest (no partner id yet, held for admin approval) instead.
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
  // No self-referral, no fabricated match — an unknown/malformed code
  // simply resolves to undefined and the signup proceeds as organic.
  const referredByPartnerId = referralCode ? await partnerIdFromReferralCode(referralCode) : undefined;
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
    referredByPartnerId,
  };

  if (partnerType?.requiresApproval) {
    let password: string;
    try {
      ({ password } = await createSignupRequest(input));
    } catch {
      redirect(`/signup?type=${encodeURIComponent(partnerTypeId)}&error=contact_taken`);
    }
    // Best-effort, awaited for the same reason as sendPartnerWelcomeEmail
    // below — redirect() throws to navigate, so a fire-and-forget promise
    // could be dropped before it resolves.
    await sendPartnerApplicationReceivedEmail({ to: businessEmail, businessName });

    const opsChatId = await getOpsChatId();
    if (opsChatId) {
      await sendRawTelegramMessage(
        opsChatId,
        await newPartnerApplicationMessage({ businessName, partnerTypeName: partnerType?.id ?? partnerTypeId })
      );
    }

    redirect(`/signup/pending?businessName=${encodeURIComponent(businessName)}`);
  }

  let partnerId: string;
  try {
    const result = await createPartner(input);
    partnerId = result.partner.id;
    // result.password is a real password (hashed and stored, needed so
    // this account works with /login on another device), but it's
    // intentionally never shown or emailed — the visitor is auto-signed-in
    // below straight into setting their own password.
  } catch {
    redirect(`/signup?type=${encodeURIComponent(partnerTypeId)}&error=contact_taken`);
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
