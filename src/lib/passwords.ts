/**
 * Password hashing via Node's built-in scrypt — no external dependency
 * (bcrypt/argon2 aren't installed, and pulling in a native-binding package
 * just for this is unnecessary risk on Vercel's build). Format stored:
 * "<saltHex>:<hashHex>".
 */
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

/**
 * Generates a readable one-time password for signup (no password field is
 * ever shown at signup — see /signup). Avoids visually ambiguous
 * characters (0/O, 1/l/I) since this is meant to be typed back in.
 */
const READABLE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export function generatePassword(length = 10): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += READABLE_CHARS[bytes[i] % READABLE_CHARS.length];
  }
  return out;
}
