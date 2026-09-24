/**
 * Lead — a bulk-uploaded or manually-entered contact worked by a Telecaller.
 * Partner-scoped throughout (assertPartnerScope applies to every read/write),
 * same convention as Field Force's bookingsData.ts. Fully independent of the
 * Service Centre module — no shared models, files, or routes; the only
 * thing this module shares with the rest of the app is PartnerStaff
 * (Telecaller is just another staff role, same as Technician/FrontDesk).
 */
import { prisma } from "@/lib/prisma";
import { assertPartnerScope } from "@/lib/tenant";
import { getPartnerStaff, listActivePartnerStaff } from "@/lib/partnerStaff";

export const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Interested",
  "FollowUpRequired",
  "Accepted",
  "Closed",
  "Lost",
  "DoNotCall",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Statuses that mean "this lead is done" — filtered out of an agent's
 * active call queue (listLeadsForAgent) and shown instead under the
 * queue's "Closed" tab (see QueueClient.tsx), so a working list only ever
 * shows leads that still need action. */
export const TERMINAL_LEAD_STATUSES = ["Accepted", "Closed", "Lost", "DoNotCall"] as const;

export type LeadRecord = {
  id: string;
  partnerId: string;
  name: string;
  phone: string;
  email: string | null;
  source: string | null;
  state: string | null;
  city: string | null;
  importBatch: string;
  status: string;
  assignedToId: string | null;
  assignedToName: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type LeadFilter = {
  assignedToId?: string;
  status?: string;
  state?: string;
  city?: string;
  importBatch?: string;
  /** Matches name, phone, or email (case-insensitive, contains). */
  search?: string;
};

const INCLUDE = { assignedTo: true } as const;

function toRecord(row: {
  id: string;
  partnerId: string;
  name: string;
  phone: string;
  email: string | null;
  source: string | null;
  state: string | null;
  city: string | null;
  importBatch: string;
  status: string;
  assignedToId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  assignedTo: { name: string } | null;
}): LeadRecord {
  return {
    id: row.id,
    partnerId: row.partnerId,
    name: row.name,
    phone: row.phone,
    email: row.email,
    source: row.source,
    state: row.state,
    city: row.city,
    importBatch: row.importBatch,
    status: row.status,
    assignedToId: row.assignedToId,
    assignedToName: row.assignedTo?.name ?? null,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function buildWhere(partnerId: string, filter?: LeadFilter) {
  return {
    partnerId,
    ...(filter?.assignedToId ? { assignedToId: filter.assignedToId } : {}),
    ...(filter?.status ? { status: filter.status } : {}),
    ...(filter?.state ? { state: filter.state } : {}),
    ...(filter?.city ? { city: filter.city } : {}),
    ...(filter?.importBatch ? { importBatch: filter.importBatch } : {}),
    ...(filter?.search
      ? {
          OR: [
            { name: { contains: filter.search, mode: "insensitive" as const } },
            { phone: { contains: filter.search } },
            { email: { contains: filter.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

export async function listLeadsForPartner(partnerId: string, filter?: LeadFilter): Promise<LeadRecord[]> {
  const rows = await prisma.lead.findMany({
    where: buildWhere(partnerId, filter),
    include: INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toRecord);
}

/** A Telecaller's own queue — leads assigned to them, PLUS any still-
 * unassigned lead whose state/city falls inside their territory (see
 * PartnerStaff.assignedStates/assignedCities) so a territory-restricted
 * agent can see and pick up new leads in their area as soon as they land,
 * not just what's been explicitly assigned. An agent with no territory set
 * (both arrays empty — the default) sees every unassigned lead too, exactly
 * as before this feature existed. `view: "active"` (default) excludes every
 * TERMINAL_LEAD_STATUS so closed leads fall out of the working list
 * automatically; `view: "closed"` shows only those, for the queue's
 * separate "Closed" tab (reference/history, not a working list). */
export async function listLeadsForAgent(
  partnerId: string,
  agentId: string,
  options?: { view?: "active" | "closed"; filter?: LeadFilter }
): Promise<LeadRecord[]> {
  const view = options?.view ?? "active";
  const agent = await getPartnerStaff(partnerId, agentId);
  const hasTerritory = Boolean(agent && (agent.assignedStates.length > 0 || agent.assignedCities.length > 0));

  const visibility = hasTerritory
    ? {
        OR: [
          { assignedToId: agentId },
          {
            assignedToId: null,
            OR: [
              ...(agent!.assignedStates.length > 0 ? [{ state: { in: agent!.assignedStates } }] : []),
              ...(agent!.assignedCities.length > 0 ? [{ city: { in: agent!.assignedCities } }] : []),
            ],
          },
        ],
      }
    : { assignedToId: agentId };

  const rows = await prisma.lead.findMany({
    // AND'd as separate clauses (not spread into one object) since both
    // buildWhere's search filter and `visibility` above may independently
    // need their own top-level "OR" key — merging them by spread would
    // silently drop one.
    where: {
      AND: [
        buildWhere(partnerId, options?.filter),
        visibility,
        { status: view === "closed" ? { in: [...TERMINAL_LEAD_STATUSES] } : { notIn: [...TERMINAL_LEAD_STATUSES] } },
      ],
    },
    include: INCLUDE,
    orderBy: { createdAt: view === "closed" ? "desc" : "asc" },
  });
  return rows.map(toRecord);
}

export async function getLead(id: string, partnerId: string): Promise<LeadRecord | null> {
  const row = await prisma.lead.findUnique({ where: { id }, include: INCLUDE });
  if (!row) return null;
  assertPartnerScope(partnerId, row.partnerId);
  return toRecord(row);
}

export async function createLead(
  partnerId: string,
  input: {
    name: string;
    phone: string;
    email?: string;
    source?: string;
    state?: string;
    city?: string;
    importBatch?: string;
    notes?: string;
  }
): Promise<LeadRecord> {
  const row = await prisma.lead.create({
    data: {
      partnerId,
      name: input.name,
      phone: input.phone,
      email: input.email || null,
      source: input.source || null,
      state: input.state || null,
      city: input.city || null,
      importBatch: input.importBatch || "Manual",
      notes: input.notes || null,
    },
    include: INCLUDE,
  });
  return toRecord(row);
}

/** Bulk insert for a CSV upload — every row belongs to the same importBatch label. Skips rows with no phone. */
export async function bulkCreateLeads(
  partnerId: string,
  importBatch: string,
  rows: { name: string; phone: string; email?: string; source?: string; state?: string; city?: string }[]
): Promise<number> {
  const valid = rows.filter((r) => r.phone && r.phone.trim());
  if (valid.length === 0) return 0;
  const result = await prisma.lead.createMany({
    data: valid.map((r) => ({
      partnerId,
      name: r.name || r.phone,
      phone: r.phone.trim(),
      email: r.email || null,
      source: r.source || "Import",
      state: r.state || null,
      city: r.city || null,
      importBatch,
    })),
  });
  return result.count;
}

/** Corrects a lead's own contact details (name/phone/email/source/state/city/notes) —
 * a typo fixed after entry or import. Status/assignment changes go through
 * updateLeadStatus/assignLead instead; this never touches either. */
export async function updateLead(
  id: string,
  partnerId: string,
  input: { name: string; phone: string; email?: string; source?: string; state?: string; city?: string; notes?: string }
): Promise<void> {
  const existing = await prisma.lead.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.lead.update({
    where: { id },
    data: {
      name: input.name,
      phone: input.phone,
      email: input.email || null,
      source: input.source || null,
      state: input.state || null,
      city: input.city || null,
      notes: input.notes || null,
    },
  });
}

export async function assignLead(id: string, partnerId: string, assignedToId: string | null): Promise<void> {
  const existing = await prisma.lead.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.lead.update({ where: { id }, data: { assignedToId } });
}

/** Bulk auto-assign: round-robins every unassigned lead in a batch across the given agent ids, ignoring territory (an explicit manual agent pick always wins). */
export async function autoAssignBatch(partnerId: string, importBatch: string, agentIds: string[]): Promise<number> {
  if (agentIds.length === 0) return 0;
  const unassigned = await prisma.lead.findMany({
    where: { partnerId, importBatch, assignedToId: null },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  await prisma.$transaction(
    unassigned.map((lead, i) =>
      prisma.lead.update({ where: { id: lead.id }, data: { assignedToId: agentIds[i % agentIds.length] } })
    )
  );
  return unassigned.length;
}

/**
 * Territory-based auto-assign: for every still-unassigned lead in a batch
 * (or, with no `importBatch` given, every unassigned lead in the partner),
 * finds every Active Telecaller whose assignedStates/assignedCities
 * matches that lead's own state/city and round-robins it to one of them
 * (a lead matching more than one agent's territory rotates evenly across
 * just that matching set, tracked independently per distinct match-set so
 * one popular city doesn't starve a less-covered one's rotation). A lead
 * matching no agent's territory is left unassigned — there's no correct
 * agent to give it to, and silently assigning it to an unrelated agent
 * would be worse than a manager noticing it in the "Unassigned" count and
 * deciding by hand (new territory, new agent, or a manual override).
 * Agents with NO territory set (open access) are intentionally excluded
 * from this pool — they're the "assign anything to me manually" case, not
 * a catch-all for every unmatched lead, which would defeat the point of
 * giving other agents a territory at all.
 */
export async function autoAssignByTerritory(partnerId: string, importBatch?: string): Promise<number> {
  const agents = await listActivePartnerStaff(partnerId, "Telecaller");
  const territoried = agents.filter((a) => a.assignedStates.length > 0 || a.assignedCities.length > 0);
  if (territoried.length === 0) return 0;

  const unassigned = await prisma.lead.findMany({
    where: { partnerId, assignedToId: null, ...(importBatch ? { importBatch } : {}) },
    select: { id: true, state: true, city: true },
    orderBy: { createdAt: "asc" },
  });
  if (unassigned.length === 0) return 0;

  // Round-robin cursor per distinct set of matching agent ids, so e.g. two
  // agents both covering "Karnataka" alternate between just the two of
  // them regardless of how many other agents/territories exist.
  const cursors = new Map<string, number>();
  const updates: { id: string; assignedToId: string }[] = [];

  for (const lead of unassigned) {
    const matches = territoried.filter(
      (a) =>
        (lead.state && a.assignedStates.includes(lead.state)) || (lead.city && a.assignedCities.includes(lead.city))
    );
    if (matches.length === 0) continue;
    const matchKey = matches
      .map((a) => a.id)
      .sort()
      .join(",");
    const cursor = cursors.get(matchKey) ?? 0;
    updates.push({ id: lead.id, assignedToId: matches[cursor % matches.length].id });
    cursors.set(matchKey, cursor + 1);
  }

  if (updates.length === 0) return 0;
  await prisma.$transaction(
    updates.map((u) => prisma.lead.update({ where: { id: u.id }, data: { assignedToId: u.assignedToId } }))
  );
  return updates.length;
}

export async function updateLeadStatus(id: string, partnerId: string, status: LeadStatus): Promise<void> {
  const existing = await prisma.lead.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.lead.update({ where: { id }, data: { status } });
}

export async function listImportBatches(partnerId: string): Promise<{ importBatch: string; count: number }[]> {
  const rows = await prisma.lead.groupBy({
    by: ["importBatch"],
    where: { partnerId },
    _count: { _all: true },
    orderBy: { _count: { importBatch: "desc" } },
  });
  return rows.map((r) => ({ importBatch: r.importBatch, count: r._count._all }));
}

/** Distinct non-null state/city values already on file, for the leads list's filter dropdowns. */
export async function listLeadLocationFilters(partnerId: string): Promise<{ states: string[]; cities: string[] }> {
  const [states, cities] = await Promise.all([
    prisma.lead.findMany({ where: { partnerId, state: { not: null } }, select: { state: true }, distinct: ["state"] }),
    prisma.lead.findMany({ where: { partnerId, city: { not: null } }, select: { city: true }, distinct: ["city"] }),
  ]);
  return {
    states: states.map((s) => s.state as string).sort(),
    cities: cities.map((c) => c.city as string).sort(),
  };
}

/**
 * Dashboard stat tiles: total leads, breakdown by status, unassigned count.
 * Takes the SAME LeadFilter the page's table query (listLeadsForPartner)
 * applies, so the tiles reflect whatever's currently filtered instead of
 * always showing whole-partner totals — unlike Service Centre/Billing's
 * stat cards, which are deliberately global by product decision, these
 * were never meant to be global; they just never had the filter threaded
 * through. `status` is deliberately excluded from the where-clause here
 * even when passed — the by-status breakdown itself is the point of these
 * tiles, so filtering by status would collapse it to a single count
 * instead of a distribution (the status filter still narrows `unassigned`
 * and `total` below, which don't have that issue).
 */
export async function getLeadStats(partnerId: string, filter?: LeadFilter): Promise<{
  total: number;
  unassigned: number;
  byStatus: Record<string, number>;
}> {
  const { status: _status, ...statusBreakdownFilter } = filter ?? {};
  const where = buildWhere(partnerId, filter);
  const [total, unassigned, statusRows] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.count({ where: { ...where, assignedToId: null } }),
    prisma.lead.groupBy({ by: ["status"], where: buildWhere(partnerId, statusBreakdownFilter), _count: { _all: true } }),
  ]);
  const byStatus: Record<string, number> = {};
  for (const s of LEAD_STATUSES) byStatus[s] = 0;
  for (const row of statusRows) byStatus[row.status] = row._count._all;
  return { total, unassigned, byStatus };
}
