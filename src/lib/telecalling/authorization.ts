import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, isValidAdminCookie } from "@/lib/adminAuth";
import { getSessionPartnerId, getStaffSession, PartnerAuthorizationError } from "@/lib/requirePartnerSession";
import { getPartnerStaff } from "@/lib/partnerStaff";
import { getLead } from "@/lib/telecalling/leadsData";

async function isManager(partnerId: string): Promise<boolean> {
  return await getSessionPartnerId() === partnerId || await isValidAdminCookie(cookies().get(ADMIN_COOKIE_NAME)?.value);
}

export async function requireTelecallingManager(partnerId: string): Promise<string> {
  if (!await isManager(partnerId)) throw new PartnerAuthorizationError("Only the partner owner or administrator can manage telecalling settings and assignments.");
  return partnerId;
}

/** Submitted identity is never authority. Staff can act only as themselves. */
export async function requireTelecallingActor(partnerId: string, leadId: string, requestedAgentId: string): Promise<string> {
  const manager = await isManager(partnerId);
  const session = manager ? undefined : await getStaffSession();
  if (!manager && (!session || session.partnerId !== partnerId || session.staffId !== requestedAgentId)) {
    throw new PartnerAuthorizationError("Invalid telecalling staff identity.");
  }
  const agent = await getPartnerStaff(partnerId, requestedAgentId);
  if (!agent || agent.status !== "Active" || agent.role !== "Telecaller") throw new PartnerAuthorizationError("An active telecaller is required.");
  const lead = await getLead(leadId, partnerId);
  if (!lead) throw new PartnerAuthorizationError("Lead not found.");
  const territoryMatch = !lead.assignedToId && (
    Boolean(lead.state && agent.assignedStates.includes(lead.state)) ||
    Boolean(lead.city && agent.assignedCities.includes(lead.city))
  );
  if (!manager && lead.assignedToId !== agent.id && !territoryMatch) {
    throw new PartnerAuthorizationError("This lead is outside your assigned queue.");
  }
  return agent.id;
}


export async function requireTelecallingLeadRead(partnerId: string, leadId: string): Promise<"manager" | "staff"> {
  if (await isManager(partnerId)) return "manager";
  const session = await getStaffSession();
  if (!session || session.partnerId !== partnerId) throw new PartnerAuthorizationError("Not signed in for this partner.");
  await requireTelecallingActor(partnerId, leadId, session.staffId);
  return "staff";
}
