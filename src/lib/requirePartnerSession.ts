/**
 * Central tenant-isolation gate for every /partner/[partnerId]/* route.
 *
 * Previously, the ONLY thing checked whether a request's session cookie
 * matched the partnerId in the URL was a handful of Service Centre server
 * actions calling `requireServiceCentreStaff` — and even that only covered
 * mutations, never page loads, and only that one module. Every other
 * module's pages, and this module's own pages when accessed directly,
 * had no server-side check at all: signing in as SC0001 and typing
 * SC0002's URL into the address bar rendered SC0002's data unchanged.
 *
 * Now there is exactly one login (the partner-owner session — see
 * src/lib/partnerSession.ts; the separate PartnerStaff/staff-session
 * concept has been removed for Service Centre, which has a single login
 * for the whole business, not a per-technician account) and exactly one
 * place that checks it applies to the partner named in the URL: here.
 * `PartnerLayout` (src/app/partner/[partnerId]/layout.tsx) calls
 * `requirePartnerSessionForPage` for every page render; every Server
 * Action that mutates a partner's data should call
 * `requireSessionPartnerId` directly too, since actions are invoked over
 * their own RPC endpoint and never run through a page's layout.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PARTNER_SESSION_COOKIE, verifyPartnerSessionToken, STAFF_SESSION_COOKIE, verifyStaffSessionToken, type StaffSessionClaims } from "@/lib/partnerSession";
import { ADMIN_COOKIE_NAME, isValidAdminCookie } from "@/lib/adminAuth";

export class PartnerAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PartnerAuthorizationError";
  }
}

/** Reads the signed-in partner id from the session cookie, or undefined if not signed in. */
export async function getSessionPartnerId(): Promise<string | undefined> {
  return verifyPartnerSessionToken(cookies().get(PARTNER_SESSION_COOKIE)?.value);
}

/** Reads the signed-in PartnerStaff session (see src/lib/telecalling/agentAuth.ts, the first
 * feature to actually issue this cookie), or undefined if not signed in as staff. */
export async function getStaffSession(): Promise<StaffSessionClaims | undefined> {
  return verifyStaffSessionToken(cookies().get(STAFF_SESSION_COOKIE)?.value);
}

/**
 * For Server Actions: throws unless the caller is signed in as exactly
 * this partnerId. Unlike a page load, an action can't `redirect()` to
 * /login and have that feel like a normal navigation to the caller, so
 * this throws — the caller (a client component's error boundary/toast)
 * is responsible for surfacing that the session is invalid.
 */
export async function requireSessionPartnerId(partnerId: string): Promise<string> {
  const sessionPartnerId = await getSessionPartnerId();
  if (!sessionPartnerId) {
    throw new PartnerAuthorizationError("Not signed in.");
  }
  if (sessionPartnerId !== partnerId) {
    throw new PartnerAuthorizationError(
      `Session scoped to partner "${sessionPartnerId}" cannot act on partner "${partnerId}"'s records.`
    );
  }
  return sessionPartnerId;
}

/**
 * For Server Actions reachable by either the partner owner OR a PartnerStaff
 * session scoped to this partner (e.g. Telecalling, where a Telecaller agent
 * has their own login — see agentAuth.ts — and PartnerLayout already lets
 * that staff session reach every page under its module's prefix, not just
 * the ones the UI links to). Mirrors requirePartnerSessionForPage's
 * owner/admin/staff acceptance, but throws instead of redirecting, same as
 * requireSessionPartnerId above.
 */
export async function requireSessionOrStaffPartnerId(partnerId: string): Promise<string> {
  const sessionPartnerId = await getSessionPartnerId();
  if (sessionPartnerId === partnerId) return partnerId;

  const adminCookie = cookies().get(ADMIN_COOKIE_NAME)?.value;
  if (await isValidAdminCookie(adminCookie)) return partnerId;

  const staffSession = await getStaffSession();
  if (staffSession && staffSession.partnerId === partnerId) return partnerId;

  throw new PartnerAuthorizationError(`No owner or staff session scoped to partner "${partnerId}".`);
}

/**
 * For Server Component pages/layouts: redirects to /login if there's no
 * session, or if the session belongs to a DIFFERENT partner than the one
 * in the URL (the actual cross-tenant case — never silently render
 * another partner's data).
 *
 * A valid Super Admin cookie (mbf_admin_session — see src/lib/adminAuth.ts)
 * also bypasses this, so Super Admin can reach a module's admin subroute
 * (/partner/{id}/{module}/admin/...) without separately being signed in AS
 * that partner. A layout can't see the full request path (only the
 * partnerId route param), so this bypass isn't narrowed to admin subroutes
 * specifically — a Super Admin session can view any partner's ordinary
 * pages too. That's consistent with Super Admin already being a trusted,
 * platform-wide elevated role elsewhere in this app (the Designer, partner
 * type configs, etc.), not a new privilege escalation.
 */
export type PageSession =
  | { kind: "owner" }
  | { kind: "admin" }
  /** A PartnerStaff account (currently only issued to the Telecalling module's
   * "Telecaller" role — see src/lib/telecalling/agentAuth.ts). Unlike the owner
   * session, this does NOT grant access to every page under this partner —
   * PartnerLayout restricts a staff session to the module matching its role,
   * since none of the other modules' data-access functions check staff
   * identity/role at all (only requireSessionPartnerId, which staff sessions
   * deliberately fail, since they are a different principal from the owner). */
  | { kind: "staff"; staffId: string; role: string };

export async function requirePartnerSessionForPage(partnerId: string): Promise<PageSession> {
  const sessionPartnerId = await getSessionPartnerId();
  if (sessionPartnerId === partnerId) return { kind: "owner" };

  const adminCookie = cookies().get(ADMIN_COOKIE_NAME)?.value;
  if (await isValidAdminCookie(adminCookie)) return { kind: "admin" };

  const staffSession = await getStaffSession();
  if (staffSession && staffSession.partnerId === partnerId) {
    const { getPartnerStaff } = await import("@/lib/partnerStaff");
    const staff = await getPartnerStaff(partnerId, staffSession.staffId);
    if (staff && staff.status === "Active") {
      return { kind: "staff", staffId: staff.id, role: staff.role };
    }
  }

  redirect("/login");
}
