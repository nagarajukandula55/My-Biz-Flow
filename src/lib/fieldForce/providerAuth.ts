/**
 * Provider self-signup/login for the Field Force marketplace — mirrors
 * customerAuth.ts. A logged-in Provider can also onboard team members under
 * them (see providersData.ts's teamLeadId) without those members needing
 * their own password set at creation time.
 */
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/passwords";
import { FIELD_FORCE_SESSION_MAX_AGE_SECONDS, createProviderSessionToken, verifyProviderSessionToken } from "@/lib/fieldForce/session";

export const PROVIDER_SESSION_COOKIE = "mbf_ff_provider_session";

export async function setProviderSession(partnerId: string, providerId: string): Promise<void> {
  const token = await createProviderSessionToken(partnerId, providerId);
  cookies().set(PROVIDER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: FIELD_FORCE_SESSION_MAX_AGE_SECONDS,
  });
}

export async function verifyProviderLogin(partnerId: string, phone: string, password: string) {
  const provider = await prisma.provider.findUnique({ where: { partnerId_phone: { partnerId, phone } } });
  if (!provider || !provider.passwordHash || provider.status !== "active") return null;
  if (!verifyPassword(password, provider.passwordHash)) return null;
  return provider;
}

export async function getCurrentProvider(partnerId: string) {
  const session = await verifyProviderSessionToken(cookies().get(PROVIDER_SESSION_COOKIE)?.value);
  if (!session || session.partnerId !== partnerId) return null;
  const provider = await prisma.provider.findUnique({ where: { id: session.principalId } });
  if (!provider || provider.partnerId !== partnerId || provider.status !== "active") return null;
  return provider;
}
