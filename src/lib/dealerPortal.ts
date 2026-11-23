import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

const TTL_SECONDS = 30 * 24 * 60 * 60;
const key = () => new TextEncoder().encode(env.partnerSessionSecret());

export async function createDealerPortalToken(input: { partnerId: string; customerId: string }) {
  return new SignJWT({ partnerId: input.partnerId, customerId: input.customerId, portal: "dealer" }).setProtectedHeader({ alg: "HS256", typ: "dealer-portal" }).setIssuedAt().setExpirationTime(`${TTL_SECONDS}s`).setSubject("dealer-portal").sign(key());
}

export async function verifyDealerPortalToken(token: string) {
  const { payload } = await jwtVerify(token, key(), { subject: "dealer-portal" });
  if (payload.portal !== "dealer" || typeof payload.partnerId !== "string" || typeof payload.customerId !== "string") throw new Error("Invalid dealer portal token");
  return { partnerId: payload.partnerId, customerId: payload.customerId };
}

export async function createDealerReferralToken(input: { partnerId: string; referrerCustomerId?: string; partnerTypeId: string }) {
  return new SignJWT({ partnerId: input.partnerId, referrerCustomerId: input.referrerCustomerId ?? null, partnerTypeId: input.partnerTypeId, portal: "dealer-referral" })
    .setProtectedHeader({ alg: "HS256", typ: "dealer-referral" }).setIssuedAt().setExpirationTime(`${TTL_SECONDS}s`).setSubject("dealer-referral").sign(key());
}

export async function verifyDealerReferralToken(token: string) {
  const { payload } = await jwtVerify(token, key(), { subject: "dealer-referral" });
  if (payload.portal !== "dealer-referral" || typeof payload.partnerId !== "string" || (payload.referrerCustomerId !== null && typeof payload.referrerCustomerId !== "string") || typeof payload.partnerTypeId !== "string") throw new Error("Invalid dealer referral token");
  return { partnerId: payload.partnerId, referrerCustomerId: typeof payload.referrerCustomerId === "string" ? payload.referrerCustomerId : undefined, partnerTypeId: payload.partnerTypeId };
}
