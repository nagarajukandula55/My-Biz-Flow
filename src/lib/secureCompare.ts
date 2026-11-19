import { timingSafeEqual } from "crypto";

/** Constant-time comparison for credentials supplied by untrusted requests. */
export function secureEqual(received: string | null | undefined, expected: string | null | undefined): boolean {
  if (!received || !expected) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
