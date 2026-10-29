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
