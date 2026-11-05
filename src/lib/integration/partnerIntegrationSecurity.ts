import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/** Encrypt partner integration secrets before persistence. Never log the result. */
export function encryptPartnerSecret(value: string, encryptionKey: string): string {
  if (!value) throw new Error("Cannot encrypt an empty integration secret.");
  if (!encryptionKey) throw new Error("Integration encryption is not configured.");
  const key = createHash("sha256").update(encryptionKey).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptPartnerSecret(payload: string, encryptionKey: string): string {
  const [ivText, tagText, valueText] = payload.split(".");
  if (!ivText || !tagText || !valueText || !encryptionKey) throw new Error("Invalid encrypted integration secret.");
  const key = createHash("sha256").update(encryptionKey).digest();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(valueText, "base64url")), decipher.final()]).toString("utf8");
}
