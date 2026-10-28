import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

const TTL_SECONDS = 7 * 24 * 60 * 60;
const secret = () => new TextEncoder().encode(env.partnerSessionSecret());

export async function createDocumentShareToken(input: {
  partnerId: string;
  moduleSlug: string;
  recordKey: string;
  documentLabel: string;
}) {
  return new SignJWT({
    partnerId: input.partnerId,
    moduleSlug: input.moduleSlug,
    recordKey: input.recordKey,
    documentLabel: input.documentLabel,
  })
    .setProtectedHeader({ alg: "HS256", typ: "document-share" })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .setSubject("document-share")
    .sign(secret());
}

export async function verifyDocumentShareToken(token: string) {
  const { payload } = await jwtVerify(token, secret(), { subject: "document-share" });
  if (typeof payload.partnerId !== "string" || typeof payload.moduleSlug !== "string" || typeof payload.recordKey !== "string") {
    throw new Error("Invalid document share token");
  }
  return payload as { partnerId: string; moduleSlug: string; recordKey: string; documentLabel?: string };
}
