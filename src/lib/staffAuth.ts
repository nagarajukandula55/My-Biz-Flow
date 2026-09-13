/**
 * First-cut authorization for a logged-in PartnerStaff session. Reads/
 * verifies the staff session cookie (src/lib/partnerSession.ts) and loads
 * the live PartnerStaff row, so a caller can confirm "this session really
 * is an Active staff member of this exact partner" before letting a
 * mutation through.
 *
 * Scope, documented honestly: this checks partner-membership + Active
 * status only ("is this staff member allowed to act on this partner's
 * Service Centre records at all"). It does NOT implement AN-CRM's full
 * per-action permission matrix (assign-engineer vs. start-repair vs.
 * complete-repair vs. cancel, each individually gated by Role/Permission/
 * RolePermission) — every Active staff member of the partner can perform
 * every gated action here. A finer per-role/per-action matrix is a
 * documented fast-follow, not built in this pass.
 */
import { cookies } from "next/headers";
import { STAFF_SESSION_COOKIE, verifyStaffSessionToken } from "@/lib/partnerSession";
import { getPartnerStaff, type PartnerStaffRecord } from "@/lib/partnerStaff";

/** Reads the current request's staff session cookie and loads the live PartnerStaff row, or undefined if not signed in (or suspended). */
export async function getStaffSession(): Promise<PartnerStaffRecord | undefined> {
  const token = cookies().get(STAFF_SESSION_COOKIE)?.value;
  const claims = await verifyStaffSessionToken(token);
  if (!claims) return undefined;
  const staff = await getPartnerStaff(claims.partnerId, claims.staffId);
  if (!staff || staff.status !== "Active") return undefined;
  return staff;
}

export class StaffAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StaffAuthorizationError";
  }
}

/**
 * First-cut gate for Service Centre workorder mutations (status
 * transitions, invoice generation, etc.): confirms a signed-in staff
 * session belongs to the SAME partnerId as the record being mutated.
 * Doesn't distinguish Technician from Manager from FrontDesk for what
 * action they may take — see the module header above.
 *
 * A missing staff session is NOT treated as a hard failure here — Service
 * Centre mutations today are also reachable directly from the Partner
 * owner's own session (which has no PartnerStaff row at all), and locking
 * those out entirely would break the owner's existing workflow. This
 * returns the staff record when one is present and validates it belongs to
 * the right partner; it throws only when a staff session EXISTS but is
 * scoped to a DIFFERENT partner (the actual cross-tenant risk).
 */
export async function requireServiceCentreStaff(partnerId: string): Promise<PartnerStaffRecord | undefined> {
  const staff = await getStaffSession();
  if (!staff) return undefined;
  if (staff.partnerId !== partnerId) {
    throw new StaffAuthorizationError(
      `Staff session scoped to partner "${staff.partnerId}" cannot act on partner "${partnerId}"'s records.`
    );
  }
  return staff;
}
