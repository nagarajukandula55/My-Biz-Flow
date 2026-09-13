"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  STAFF_SESSION_COOKIE,
  STAFF_SESSION_MAX_AGE_SECONDS,
  createStaffSessionToken,
} from "@/lib/partnerSession";
import { findPartnerStaffByEmail, verifyPartnerStaffPassword } from "@/lib/partnerStaff";

/**
 * Staff login: looks up a PartnerStaff row by (partnerId, email) — never
 * across partners — verifies the password hash, and sets the staff session
 * cookie (distinct from the Partner owner's own session cookie/token, see
 * src/lib/partnerSession.ts). Suspended accounts are rejected the same as a
 * wrong password, so a suspension takes effect immediately for future
 * logins (an already-issued session is only invalidated once it expires or
 * is re-checked — see getStaffSession()).
 */
export async function signInAsStaff(partnerId: string, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const staff = await findPartnerStaffByEmail(partnerId, email);
  if (!staff || staff.status !== "Active" || !(await verifyPartnerStaffPassword(partnerId, staff.id, password))) {
    redirect(`/partner/${partnerId}/service-centre/staff-login?error=invalid_credentials`);
  }

  const token = await createStaffSessionToken({ partnerId, staffId: staff.id });
  cookies().set(STAFF_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STAFF_SESSION_MAX_AGE_SECONDS,
  });

  if (staff.mustChangePassword) {
    redirect(`/partner/${partnerId}/service-centre/staff-change-password`);
  }

  redirect(`/partner/${partnerId}/service-centre`);
}

/** Clears the staff session cookie and returns to the staff login page. */
export async function signOutStaffAction(partnerId: string) {
  cookies().delete(STAFF_SESSION_COOKIE);
  redirect(`/partner/${partnerId}/service-centre/staff-login`);
}
