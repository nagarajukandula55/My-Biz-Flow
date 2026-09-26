"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreatePosAccount, createPosStaff } from "@/lib/pos/posAccount";
import { verifyPosStaffLogin, POS_STAFF_SESSION_COOKIE } from "@/lib/pos/posAuth";

/**
 * First-ever signup for a partner creates the PosAccount too (its
 * accountNumber, e.g. "POS0001") and makes that first staff member a
 * Manager — they're the one setting the outlet up. Every signup after
 * that joins the same existing account and gets the role picked on the
 * form (default Cashier). Open self-signup, same posture as Field Force's
 * provider self-signup — no approval step in this pass.
 */
export async function signupPosStaffAction(partnerId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const outletName = String(formData.get("outletName") ?? "").trim();
  let role = String(formData.get("role") ?? "Cashier");

  if (!name || !password) throw new Error("Name and password are required");
  if (password.length < 6) throw new Error("Password must be at least 6 characters");

  const account = await getOrCreatePosAccount(partnerId, outletName || undefined);
  const isFirstStaff = (await prisma.posStaff.count({ where: { posAccountId: account.id } })) === 0;
  if (isFirstStaff) role = "Manager";
  if (role !== "Cashier" && role !== "Manager") role = "Cashier";

  const staff = await createPosStaff({
    posAccountId: account.id,
    accountNumber: account.accountNumber,
    name,
    phone: phone || undefined,
    password,
    role: role as "Cashier" | "Manager",
  });

  cookies().set(POS_STAFF_SESSION_COOKIE, staff.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect(`/partner/${partnerId}/pos`);
}

export async function loginPosStaffAction(partnerId: string, formData: FormData) {
  const staffCode = String(formData.get("staffCode") ?? "").trim().toUpperCase();
  const password = String(formData.get("password") ?? "");

  const staff = await verifyPosStaffLogin(partnerId, staffCode, password);
  if (!staff) redirect(`/partner/${partnerId}/pos/staff/login?error=1`);

  await prisma.posStaff.update({ where: { id: staff.id }, data: { lastLoginAt: new Date() } });
  cookies().set(POS_STAFF_SESSION_COOKIE, staff.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect(`/partner/${partnerId}/pos`);
}

export async function logoutPosStaffAction(partnerId: string) {
  cookies().delete(POS_STAFF_SESSION_COOKIE);
  redirect(`/partner/${partnerId}/pos/staff/login`);
}
