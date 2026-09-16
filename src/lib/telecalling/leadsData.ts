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

/** A Telecaller's own queue — leads assigned to them. `view: "active"` (default)
 * excludes every TERMINAL_LEAD_STATUS so closed leads fall out of the working
 * list automatically; `view: "closed"` shows only those, for the queue's
 * separate "Closed" tab (reference/history, not a working list). */
export async function listLeadsForAgent(
  partnerId: string,
  agentId: string,
  options?: { view?: "active" | "closed"; filter?: LeadFilter }
): Promise<LeadRecord[]> {
  const view = options?.view ?? "active";
  const rows = await prisma.lead.findMany({
    where: {
      ...buildWhere(partnerId, options?.filter),
      assignedToId: agentId,
      status: view === "closed" ? { in: [...TERMINAL_LEAD_STATUSES] } : { notIn: [...TERMINAL_LEAD_STATUSES] },
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

export async function assignLead(id: string, partnerId: string, assignedToId: string | null): Promise<void> {
  const existing = await prisma.lead.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.lead.update({ where: { id }, data: { assignedToId } });
}

/** Bulk auto-assign: round-robins every unassigned lead in a batch across the given agent ids. */
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

/** Dashboard stat tiles: total leads, breakdown by status, unassigned count. */
export async function getLeadStats(partnerId: string): Promise<{
  total: number;
  unassigned: number;
  byStatus: Record<string, number>;
}> {
  const [total, unassigned, statusRows] = await Promise.all([
    prisma.lead.count({ where: { partnerId } }),
    prisma.lead.count({ where: { partnerId, assignedToId: null } }),
    prisma.lead.groupBy({ by: ["status"], where: { partnerId }, _count: { _all: true } }),
  ]);
  const byStatus: Record<string, number> = {};
  for (const s of LEAD_STATUSES) byStatus[s] = 0;
  for (const row of statusRows) byStatus[row.status] = row._count._all;
  return { total, unassigned, byStatus };
}
