/**
 * Call — an agent's own disposition record for one call attempt against a
 * Lead. The call itself happens on the agent's phone via a tel: link
 * (src/app/partner/[partnerId]/telecalling/queue/LeadQueueClient.tsx); there
 * is no telephony vendor wired up, so no CDR/recording/duration exists here.
 */
import { prisma } from "@/lib/prisma";
import { assertPartnerScope } from "@/lib/tenant";
import { type LeadStatus } from "@/lib/telecalling/leadsData";
import { sendWhatsAppTemplateMessage } from "@/lib/whatsapp";
import { isWhatsappTriggerEnabled } from "@/lib/whatsappTriggers";
import { SITE_URL } from "@/lib/seo";

/** Meta-approved WhatsApp template name/language for the lead-accepted welcome message (WhatsApp Manager > Message templates) — {{1}}=lead name, {{2}}=site link, matching the order the template body was written in. */
const LEAD_WELCOME_TEMPLATE = { name: "lead_welcome", languageCode: "en" };

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
  /** True only if the "lead accepted" WhatsApp welcome template was actually accepted by Meta's API on this call — lets the queue UI show a real confirmation instead of assuming it always sends. */
  whatsappWelcomeSent: boolean;
};

function toRecord(
  row: {
    id: string;
    leadId: string;
    partnerId: string;
    agentId: string;
    outcome: string;
    notes: string | null;
    callbackAt: Date | null;
    createdAt: Date;
    agent: { name: string };
  },
  whatsappWelcomeSent = false
): CallRecord {
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
    whatsappWelcomeSent,
  };
}

export async function listCallsForLead(leadId: string, partnerId: string): Promise<CallRecord[]> {
  const rows = await prisma.call.findMany({
    where: { leadId, partnerId },
    include: { agent: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => toRecord(r));
}

/** Logs a call's outcome and advances the Lead's status accordingly. */
export async function logCall(
  partnerId: string,
  input: { leadId: string; agentId: string; outcome: CallOutcome; notes?: string; callbackAt?: Date }
): Promise<CallRecord> {
  if (!CALL_OUTCOMES.includes(input.outcome)) throw new Error("Invalid call outcome");
  if (input.callbackAt && !Number.isFinite(input.callbackAt.getTime())) throw new Error("Invalid callback date");
  const { lead, row } = await prisma.$transaction(async tx => {
    const lead = await tx.lead.findUniqueOrThrow({ where: { id: input.leadId } });
    assertPartnerScope(partnerId, lead.partnerId);
    const agent = await tx.partnerStaff.findFirst({ where: { id: input.agentId, partnerId, role: "Telecaller", status: "Active" }, select: { id: true } });
    if (!agent) throw new Error("An active telecaller belonging to this partner is required.");
    const row = await tx.call.create({
      data: { leadId: lead.id, partnerId, agentId: agent.id, outcome: input.outcome,
        notes: input.notes || null, callbackAt: input.callbackAt || null },
      include: { agent: true },
    });
    await tx.lead.update({ where: { id: lead.id, partnerId }, data: { status: OUTCOME_TO_LEAD_STATUS[input.outcome] } });
    return { lead, row };
  });

  // Automated WhatsApp trigger — off by default, turned on per
  // PlatformSettings.enabledWhatsappTriggers (see whatsappTriggers.ts). Uses
  // the Meta-APPROVED "lead_welcome" template (WhatsApp Manager > Message
  // templates), not free-form text — a cold-called lead who's never
  // messaged this number first is outside the 24h window free-form
  // messages require, so only a template can reliably reach them.
  // Best-effort: sendWhatsAppTemplateMessage never throws (see whatsapp.ts),
  // so a send failure/misconfiguration can never break logging the call.
  let whatsappWelcomeSent = false;
  if (input.outcome === "Accepted" && (await isWhatsappTriggerEnabled("telecalling.leadAccepted"))) {
    whatsappWelcomeSent = await sendWhatsAppTemplateMessage(
      lead.phone,
      LEAD_WELCOME_TEMPLATE.name,
      LEAD_WELCOME_TEMPLATE.languageCode,
      [lead.name, SITE_URL]
    );
  }

  return toRecord(row, whatsappWelcomeSent);
}
