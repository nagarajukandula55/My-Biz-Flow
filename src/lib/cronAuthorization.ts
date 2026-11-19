/** Missing configuration must never turn a scheduled write endpoint public. */
import { secureEqual } from "@/lib/secureCompare";

export function isAuthorizedCronRequest(authorization: string | null, secret: string | undefined): boolean {
  return Boolean(secret?.trim()) && secureEqual(authorization, `Bearer ${secret}`);
}
