/**
 * Shared "finish logging a partner in" step — sets the signed session
 * cookie exactly the way signInAsPartner (src/app/login/actions.ts) does,
 * and returns where to send the browser next (respecting
 * mustChangePassword). Used by every login path that authenticates a
 * partner OUTSIDE the password form (Google Sign-In, Telegram Login Widget)
 * so all three paths share one implementation of the security-relevant
 * cookie-setting step instead of copy-pasting it.
 */
import { cookies } from "next/headers";
import {
  PARTNER_SESSION_COOKIE,
  PARTNER_SESSION_MAX_AGE_SECONDS,
  createPartnerSessionToken,
} from "@/lib/partnerSession";
import { getPartnerHomePath } from "@/lib/partnerHome";
import type { PartnerRecord } from "@/lib/partnerData";

/**
 * Sets the partner session cookie for an already-authenticated partner and
 * returns the path to redirect to. Returns `{ ok: false }` only if the
 * session secret is misconfigured (mirrors signInAsPartner's own try/catch
 * around createPartnerSessionToken) — callers should redirect to
 * /login?error=server_misconfigured in that case.
 */
export async function completePartnerLogin(
  partner: Pick<PartnerRecord, "id" | "partnerTypeId" | "mustChangePassword">
): Promise<{ ok: true; redirectPath: string } | { ok: false }> {
  let token: string;
  try {
    token = await createPartnerSessionToken(partner.id);
  } catch {
    return { ok: false };
  }

  cookies().set(PARTNER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PARTNER_SESSION_MAX_AGE_SECONDS,
  });

  if (partner.mustChangePassword) {
    return { ok: true, redirectPath: "/change-password" };
  }
  return { ok: true, redirectPath: await getPartnerHomePath(partner) };
}
