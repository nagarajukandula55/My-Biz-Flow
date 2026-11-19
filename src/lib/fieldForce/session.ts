import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

export const FIELD_FORCE_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

type FieldForceSessionPurpose = "field-force-customer" | "field-force-provider";
type FieldForceSession = { partnerId: string; principalId: string };

const signingKey = () => new TextEncoder().encode(env.partnerSessionSecret());

async function createFieldForceSessionToken(
  purpose: FieldForceSessionPurpose,
  partnerId: string,
  principalId: string
): Promise<string> {
  return new SignJWT({ purpose, partnerId, principalId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${FIELD_FORCE_SESSION_MAX_AGE_SECONDS}s`)
    .sign(signingKey());
}

async function verifyFieldForceSessionToken(
  token: string | undefined,
  purpose: FieldForceSessionPurpose
): Promise<FieldForceSession | undefined> {
  if (!token) return undefined;
  try {
    const { payload } = await jwtVerify(token, signingKey(), { algorithms: ["HS256"] });
    if (payload.purpose !== purpose || typeof payload.partnerId !== "string" || typeof payload.principalId !== "string") return undefined;
    return { partnerId: payload.partnerId, principalId: payload.principalId };
  } catch {
    return undefined;
  }
}

export const createCustomerSessionToken = (partnerId: string, customerId: string) =>
  createFieldForceSessionToken("field-force-customer", partnerId, customerId);
export const createProviderSessionToken = (partnerId: string, providerId: string) =>
  createFieldForceSessionToken("field-force-provider", partnerId, providerId);
export const verifyCustomerSessionToken = (token: string | undefined) =>
  verifyFieldForceSessionToken(token, "field-force-customer");
export const verifyProviderSessionToken = (token: string | undefined) =>
  verifyFieldForceSessionToken(token, "field-force-provider");
