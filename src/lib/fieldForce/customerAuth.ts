/**
 * Customer self-signup/login for the Field Force marketplace — mirrors
 * src/app/login/actions.ts's cookie-session pattern (httpOnly, sameSite lax,
 * id-in-cookie), scoped to one partner's storefront. Same demo-honesty
 * scoping as partner login: a real session table/expiry/revocation system
 * doesn't exist yet, this is a cookie holding a Customer id.
 */
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/passwords";

export const CUSTOMER_SESSION_COOKIE = "mbf_ff_customer_session";

export async function createCustomerAccount(
  partnerId: string,
  input: { name: string; phone: string; email?: string; password: string }
) {
  const existing = await prisma.customer.findUnique({ where: { partnerId_phone: { partnerId, phone: input.phone } } });
  if (existing) {
    if (existing.passwordHash) throw new Error("An account with this phone number already exists — try logging in.");
    // Ops onboarded this customer without a login before — let signup claim it.
    return prisma.customer.update({
      where: { id: existing.id },
      data: { passwordHash: hashPassword(input.password), name: input.name, email: input.email || existing.email },
    });
  }
  return prisma.customer.create({
    data: { partnerId, name: input.name, phone: input.phone, email: input.email || null, passwordHash: hashPassword(input.password) },
  });
}

export async function verifyCustomerLogin(partnerId: string, phone: string, password: string) {
  const customer = await prisma.customer.findUnique({ where: { partnerId_phone: { partnerId, phone } } });
  if (!customer || !customer.passwordHash) return null;
  if (!verifyPassword(password, customer.passwordHash)) return null;
  return customer;
}

export async function getCurrentCustomer(partnerId: string) {
  const id = cookies().get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!id) return null;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer || customer.partnerId !== partnerId) return null;
  return customer;
}
