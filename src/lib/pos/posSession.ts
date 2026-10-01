import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";
export const POS_SESSION_MAX_AGE = 8 * 60 * 60;
const key = () => new TextEncoder().encode(env.partnerSessionSecret());
export async function createPosSessionToken(partnerId: string, staffId: string) {
  return new SignJWT({ partnerId, staffId, purpose: "pos-staff-session" }).setProtectedHeader({ alg: "HS256" })
    .setIssuedAt().setExpirationTime(`${POS_SESSION_MAX_AGE}s`).sign(key());
}
export async function verifyPosSessionToken(token: string | undefined): Promise<{ partnerId: string; staffId: string } | undefined> {
  if (!token) return undefined;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (payload.purpose !== "pos-staff-session" || typeof payload.partnerId !== "string" || typeof payload.staffId !== "string") return undefined;
    return { partnerId: payload.partnerId, staffId: payload.staffId };
  } catch { return undefined; }
}
