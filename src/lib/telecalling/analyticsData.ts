/**
 * Telecalling's own analytics summary — the generic platform Analytics page
 * (src/app/partner/[partnerId]/analytics/page.tsx) only ever queried
 * Billing/Service Centre data, so a partner whose only enabled module is
 * Telecalling got a blank page with nothing but a "not available" sentence.
 * This gives that page real Lead/Call numbers to show instead.
 */
import { prisma } from "@/lib/prisma";
import { getLeadStats, TERMINAL_LEAD_STATUSES } from "@/lib/telecalling/leadsData";

export type TelecallingAnalyticsSummary = {
  totalLeads: number;
  unassignedLeads: number;
  byStatus: Record<string, number>;
  convertedLeads: number;
  conversionRatePct: number;
  callsToday: number;
  callsLast7Days: number;
  agentLeaderboard: { agentId: string; agentName: string; leadCount: number; callCount: number }[];
};

export async function getTelecallingAnalyticsSummary(partnerId: string): Promise<TelecallingAnalyticsSummary> {
  const stats = await getLeadStats(partnerId);
  const convertedLeads = stats.byStatus["Accepted"] ?? 0;
  const closedOutLeads = (TERMINAL_LEAD_STATUSES as readonly string[]).reduce((sum, s) => sum + (stats.byStatus[s] ?? 0), 0);
  const conversionRatePct = closedOutLeads > 0 ? Math.round((convertedLeads / closedOutLeads) * 100) : 0;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [callsToday, callsLast7Days, leadsByAgent, callsByAgent, agents] = await Promise.all([
    prisma.call.count({ where: { partnerId, createdAt: { gte: startOfToday } } }),
    prisma.call.count({ where: { partnerId, createdAt: { gte: sevenDaysAgo } } }),
    prisma.lead.groupBy({ by: ["assignedToId"], where: { partnerId, assignedToId: { not: null } }, _count: { _all: true } }),
    prisma.call.groupBy({ by: ["agentId"], where: { partnerId, createdAt: { gte: sevenDaysAgo } }, _count: { _all: true } }),
    prisma.partnerStaff.findMany({ where: { partnerId, role: "Telecaller" }, select: { id: true, name: true } }),
  ]);

  const agentNameById = new Map(agents.map((a) => [a.id, a.name]));
  const leadCountByAgent = new Map(leadsByAgent.map((r) => [r.assignedToId as string, r._count._all]));
  const callCountByAgent = new Map(callsByAgent.map((r) => [r.agentId, r._count._all]));

  const agentLeaderboard = agents
    .map((a) => ({
      agentId: a.id,
      agentName: a.name,
      leadCount: leadCountByAgent.get(a.id) ?? 0,
      callCount: callCountByAgent.get(a.id) ?? 0,
    }))
    .sort((a, b) => b.callCount - a.callCount || b.leadCount - a.leadCount);

  return {
    totalLeads: stats.total,
    unassignedLeads: stats.unassigned,
    byStatus: stats.byStatus,
    convertedLeads,
    conversionRatePct,
    callsToday,
    callsLast7Days,
    agentLeaderboard,
  };
}
