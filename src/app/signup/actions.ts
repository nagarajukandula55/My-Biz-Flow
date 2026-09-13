"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createPartner } from "@/lib/partnerData";
import { createSignupRequest } from "@/lib/partnerSignupRequestsData";
import { getPartnerType } from "@/lib/designer/partnerTypesData";
import { sendPartnerWelcomeEmail } from "@/lib/email";
import { sendPartnerApplicationReceivedEmail } from "@/lib/email/partnerEmails";
import {
  ONE_TIME_CREDENTIAL_COOKIE,
  ONE_TIME_CREDENTIAL_MAX_AGE_SECONDS,
  createOneTimeCredentialToken,
} from "@/lib/partnerSession";

/**
 * Real "register your business" action. No password is collected here —
 * one is generated and shown once on the success page (see /signup/success
 * and /signup/pending), matching the forced-change-on-first-login flow.
 * If the chosen Partner Type has requiresApproval on, this creates a
 * PartnerSignupRequest (no VND#### id yet) instead of a Partner directly.
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

  if (!partnerTypeId || !businessName || !city || !state || !pincode || !businessEmail || !businessContact || !loginContact) {
    throw new Error("Missing required signup fields");
  }

  const partnerType = await getPartnerType(partnerTypeId);
  const input = { partnerTypeId, businessName, addressLine, city, state, pincode, gstin, businessEmail, businessContact, loginContact };

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
    redirect(`/signup/pending?businessName=${encodeURIComponent(businessName)}`);
  }

  let partnerId: string;
  let password: string;
  try {
    const result = await createPartner(input);
    partnerId = result.partner.id;
    password = result.password;
  } catch {
    redirect(`/signup?type=${encodeURIComponent(partnerTypeId)}&error=contact_taken`);
  }

  // Best-effort — sendPartnerWelcomeEmail never throws — but awaited
  // (rather than fire-and-forget) since redirect() below throws to
  // navigate, and a serverless function invocation can end before a
  // dangling background promise completes.
  await sendPartnerWelcomeEmail({ to: businessEmail, businessName, partnerId, password });

  // Hand the one-time password to the success page via a short-lived,
  // httpOnly, single-purpose cookie instead of a URL query string — a
  // query string ends up in browser history and the referrer header of
  // any outbound link on that page. See partnerSession.ts's doc comment.
  const credentialToken = await createOneTimeCredentialToken({ partnerId, password });
  cookies().set(ONE_TIME_CREDENTIAL_COOKIE, credentialToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/signup/success",
    maxAge: ONE_TIME_CREDENTIAL_MAX_AGE_SECONDS,
  });

  redirect("/signup/success");
}
