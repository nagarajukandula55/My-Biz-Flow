"use server";
import { createPosSessionToken, POS_SESSION_MAX_AGE } from "@/lib/pos/posSession";

import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { withRecordLock } from "@/lib/withRecordLock";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreatePosAccount, createPosStaff } from "@/lib/pos/posAccount";
import { verifyPosStaffLogin, POS_STAFF_SESSION_COOKIE } from "@/lib/pos/posAuth";

/** Owner/Admin provisions staff; public self-registration is not permitted. */
export async function signupPosStaffAction(partnerId: string, formData: FormData) {
  await requireSessionPartnerId(partnerId);
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const outletName = String(formData.get("outletName") ?? "").trim();
  let role = String(formData.get("role") ?? "Cashier");

  if (!name || !password) throw new Error("Name and password are required");
  if (password.length < 6) throw new Error("Password must be at least 6 characters");

  const staff = await withRecordLock("inventory-partner", partnerId, async () => {
  const account = await getOrCreatePosAccount(partnerId, outletName || undefined);
  const isFirstStaff = (await prisma.posStaff.count({ where: { posAccountId: account.id } })) === 0;
  if (isFirstStaff) role = "Manager";
  if (role !== "Cashier" && role !== "Manager") role = "Cashier";

  return createPosStaff({
    posAccountId: account.id,
    accountNumber: account.accountNumber,
    name,
    phone: phone || undefined,
    password,
    role: role as "Cashier" | "Manager",
  });
  });

  cookies().set(POS_STAFF_SESSION_COOKIE, await createPosSessionToken(partnerId, staff.id), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: POS_SESSION_MAX_AGE });
  redirect(`/partner/${partnerId}/pos`);
}

export async function loginPosStaffAction(partnerId: string, formData: FormData) {
  const staffCode = String(formData.get("staffCode") ?? "").trim().toUpperCase();
  const password = String(formData.get("password") ?? "");

  const staff = await verifyPosStaffLogin(partnerId, staffCode, password);
  if (!staff) redirect(`/partner/${partnerId}/pos/staff/login?error=1`);

  await prisma.posStaff.update({ where: { id: staff.id }, data: { lastLoginAt: new Date() } });
  cookies().set(POS_STAFF_SESSION_COOKIE, await createPosSessionToken(partnerId, staff.id), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: POS_SESSION_MAX_AGE });
  redirect(`/partner/${partnerId}/pos`);
}

export async function logoutPosStaffAction(partnerId: string) {
  cookies().delete(POS_STAFF_SESSION_COOKIE);
  redirect(`/partner/${partnerId}/pos/staff/login`);
}
