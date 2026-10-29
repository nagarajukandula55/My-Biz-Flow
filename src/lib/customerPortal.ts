import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";
const key = () => new TextEncoder().encode(env.partnerSessionSecret());
export async function createCustomerPortalToken(input: { partnerId: string; customer: string }) { return new SignJWT({ partnerId: input.partnerId, customer: input.customer, portal: "customer" }).setProtectedHeader({ alg: "HS256", typ: "customer-portal" }).setIssuedAt().setExpirationTime("30d").setSubject("customer-portal").sign(key()); }
export async function verifyCustomerPortalToken(token: string) { const { payload } = await jwtVerify(token, key(), { subject: "customer-portal" }); if (payload.portal !== "customer" || typeof payload.partnerId !== "string" || typeof payload.customer !== "string") throw new Error("Invalid customer portal token"); return { partnerId: payload.partnerId, customer: payload.customer }; }
