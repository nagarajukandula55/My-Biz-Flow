/**
 * Provider self-signup/login for the Field Force marketplace — mirrors
 * customerAuth.ts. A logged-in Provider can also onboard team members under
 * them (see providersData.ts's teamLeadId) without those members needing
 * their own password set at creation time.
 */
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/passwords";

export const PROVIDER_SESSION_COOKIE = "mbf_ff_provider_session";

export async function verifyProviderLogin(partnerId: string, phone: string, password: string) {
  const provider = await prisma.provider.findUnique({ where: { partnerId_phone: { partnerId, phone } } });
  if (!provider || !provider.passwordHash) return null;
  if (!verifyPassword(password, provider.passwordHash)) return null;
  return provider;
}

export async function getCurrentProvider(partnerId: string) {
  const id = cookies().get(PROVIDER_SESSION_COOKIE)?.value;
  if (!id) return null;
  const provider = await prisma.provider.findUnique({ where: { id } });
  if (!provider || provider.partnerId !== partnerId) return null;
  return provider;
}
