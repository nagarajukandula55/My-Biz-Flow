/**
 * Call — an agent's own disposition record for one call attempt against a
 * Lead. The call itself happens on the agent's phone via a tel: link
 * (src/app/partner/[partnerId]/telecalling/queue/LeadQueueClient.tsx); there
 * is no telephony vendor wired up, so no CDR/recording/duration exists here.
 */
import { prisma } from "@/lib/prisma";
import { assertPartnerScope } from "@/lib/tenant";
import { updateLeadStatus, type LeadStatus } from "@/lib/telecalling/leadsData";

export const CALL_OUTCOMES = [
  "Interested",
  "NotReachable",
  "FollowUpRequired",
  "Accepted",
  "Closed",
  "DoNotCall",
  "WrongNumber",
] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

/** Outcome -> the Lead.status it should advance to. Interested/NotReachable/
 * FollowUpRequired keep the lead in the agent's active queue; the rest are
 * TERMINAL_LEAD_STATUSES (leadsData.ts) and move it to the queue's Closed tab. */
const OUTCOME_TO_LEAD_STATUS: Record<CallOutcome, LeadStatus> = {
  Interested: "Interested",
  NotReachable: "Contacted",
  FollowUpRequired: "FollowUpRequired",
  Accepted: "Accepted",
  Closed: "Closed",
  DoNotCall: "DoNotCall",
  WrongNumber: "Lost",
};

export type CallRecord = {
  id: string;
  leadId: string;
  partnerId: string;
  agentId: string;
  agentName: string;
  outcome: string;
  notes: string | null;
  callbackAt: Date | null;
  createdAt: Date;
};

function toRecord(row: {
  id: string;
  leadId: string;
  partnerId: string;
  agentId: string;
  outcome: string;
  notes: string | null;
  callbackAt: Date | null;
  createdAt: Date;
  agent: { name: string };
}): CallRecord {
  return {
    id: row.id,
    leadId: row.leadId,
    partnerId: row.partnerId,
    agentId: row.agentId,
    agentName: row.agent.name,
    outcome: row.outcome,
    notes: row.notes,
    callbackAt: row.callbackAt,
    createdAt: row.createdAt,
  };
}

export async function listCallsForLead(leadId: string, partnerId: string): Promise<CallRecord[]> {
  const rows = await prisma.call.findMany({
    where: { leadId, partnerId },
    include: { agent: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toRecord);
}

/** Logs a call's outcome and advances the Lead's status accordingly. */
export async function logCall(
  partnerId: string,
  input: { leadId: string; agentId: string; outcome: CallOutcome; notes?: string; callbackAt?: Date }
): Promise<CallRecord> {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: input.leadId } });
  assertPartnerScope(partnerId, lead.partnerId);

  const row = await prisma.call.create({
    data: {
      leadId: input.leadId,
      partnerId,
      agentId: input.agentId,
      outcome: input.outcome,
      notes: input.notes || null,
      callbackAt: input.callbackAt || null,
    },
    include: { agent: true },
  });
  await updateLeadStatus(input.leadId, partnerId, OUTCOME_TO_LEAD_STATUS[input.outcome]);
  return toRecord(row);
}
