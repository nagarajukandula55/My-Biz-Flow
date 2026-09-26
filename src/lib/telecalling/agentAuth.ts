"use server";

/**
 * Telecaller agent login — the first real user of PartnerStaff's session
 * token machinery (src/lib/partnerSession.ts's createStaffSessionToken/
 * verifyStaffSessionToken existed unused until now). A PartnerStaff row
 * with role "Telecaller" logs in with a generated Agent ID + password
 * (src/lib/partnerStaff.ts's loginId/nextAgentLoginId — not email, an agent
 * shouldn't need one just to sign in), separate from the business owner's
 * own /login — see src/lib/requirePartnerSession.ts (PageSession's "staff"
 * case) and src/app/partner/[partnerId]/layout.tsx for how that session is
 * scoped to ONLY this module's pages.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findPartnerStaffByLoginId, verifyPartnerStaffPassword, setPartnerStaffPassword } from "@/lib/partnerStaff";
import { createStaffSessionToken, STAFF_SESSION_COOKIE, STAFF_SESSION_MAX_AGE_SECONDS } from "@/lib/partnerSession";
import { getStaffSession } from "@/lib/requirePartnerSession";
import { prisma } from "@/lib/prisma";

export async function staffLoginAction(partnerId: string, formData: FormData) {
  const agentLoginId = String(formData.get("agentId") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const staff = await findPartnerStaffByLoginId(partnerId, agentLoginId);
  if (!staff || staff.role !== "Telecaller" || staff.status !== "Active" || !(await verifyPartnerStaffPassword(partnerId, staff.id, password))) {
    redirect(`/partner/${partnerId}/telecalling/login?error=1`);
  }

  const token = await createStaffSessionToken({ partnerId, staffId: staff.id });
  cookies().set(STAFF_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STAFF_SESSION_MAX_AGE_SECONDS,
  });

  await prisma.partnerStaff.update({ where: { id: staff.id }, data: { lastLoginAt: new Date() } });

  if (staff.mustChangePassword) {
    redirect(`/partner/${partnerId}/telecalling/change-password`);
  }
  redirect(`/partner/${partnerId}/telecalling/queue`);
}

export async function staffLogoutAction(partnerId: string) {
  cookies().delete(STAFF_SESSION_COOKIE);
  redirect(`/partner/${partnerId}/telecalling/login`);
}

export async function staffChangePasswordAction(partnerId: string, formData: FormData) {
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (newPassword.length < 8) {
    redirect(`/partner/${partnerId}/telecalling/change-password?error=too_short`);
  }
  if (newPassword !== confirmPassword) {
    redirect(`/partner/${partnerId}/telecalling/change-password?error=mismatch`);
  }

  const session = await getStaffSession();
  if (!session || session.partnerId !== partnerId) {
    redirect(`/partner/${partnerId}/telecalling/login`);
    return;
  }
  await setPartnerStaffPassword(partnerId, session.staffId, newPassword);
  redirect(`/partner/${partnerId}/telecalling/queue`);
}
