/**
 * POS staff signup/login — POS is its own standalone module with its own
 * login identity, entirely separate from the main partner session every
 * other module (Service Centre, Billing, Inventory...) uses, and with no
 * customer-facing side at all (unlike Field Force's customer+provider
 * split — POS is staff-only). Mirrors the shape of
 * src/lib/fieldForce/providerAuth.ts, but the login identifier is a
 * human-readable staffCode ("POS0001-01", an internal employee code) —
 * not a phone number — since there's no customer/technician-facing signup
 * to key off of.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/passwords";

export const POS_STAFF_SESSION_COOKIE = "mbf_pos_staff_session";

export async function verifyPosStaffLogin(partnerId: string, staffCode: string, password: string) {
  const staff = await prisma.posStaff.findUnique({
    where: { staffCode },
    include: { posAccount: true },
  });
  if (!staff || staff.posAccount.partnerId !== partnerId) return null;
  if (staff.status !== "Active") return null;
  if (!verifyPassword(password, staff.passwordHash)) return null;
  return staff;
}

export async function getCurrentPosStaff(partnerId: string) {
  const id = cookies().get(POS_STAFF_SESSION_COOKIE)?.value;
  if (!id) return null;
  const staff = await prisma.posStaff.findUnique({ where: { id }, include: { posAccount: true } });
  if (!staff || staff.posAccount.partnerId !== partnerId || staff.status !== "Active") return null;
  return staff;
}

/**
 * Page-level gate for every POS operational page (list/checkout/detail) —
 * redirects to the staff login (not the main partner login) when nobody's
 * signed in. Call at the top of each POS page's async component; the
 * returned staff is guaranteed non-null to every caller past this point.
 */
export async function requirePosStaff(partnerId: string) {
  const staff = await getCurrentPosStaff(partnerId);
  if (!staff) redirect(`/partner/${partnerId}/pos/staff/login`);
  return staff;
}

/** Gates a Manager-only action (till open/close, returns approval, reports) — Cashier-role staff are refused. */
export function requirePosManager(staff: { role: string } | null): void {
  if (!staff) throw new Error("Not logged in as POS staff.");
  if (staff.role !== "Manager") throw new Error("Only a Manager can do this.");
}

/**
 * Server Action gate for POS — the equivalent of
 * requireSessionPartnerId/requireSessionOrStaffPartnerId in
 * requirePartnerSession.ts, but for POS's own separate staff session
 * instead of the main partner session (which a POS staff member never has
 * — see PartnerLayout's STAFF_ONLY_MODULE_PREFIXES). Every mutating POS
 * Server Action (completeSaleAction, voidSaleAction, ...) must call this
 * instead of requireSessionPartnerId, or it would throw for every real POS
 * staff caller.
 */
export async function requirePosStaffAction(partnerId: string) {
  const staff = await getCurrentPosStaff(partnerId);
  if (!staff) throw new Error("Not signed in as POS staff.");
  return staff;
}
