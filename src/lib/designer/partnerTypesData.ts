/**
 * Partner Types — real Prisma-backed store (`PartnerType` table). The
 * top-level entity a partner account is created against; bundles a default
 * module set, which Roles are assignable, its OWN Basic/Pro/Ultimate PAGE
 * breakdown (planTierByPage — every type proposes its own page split,
 * confirmed 2026-08-08), and which of the 3 real Plan price points
 * (src/lib/plansData.ts) it bundles for actual billing (planIds, added
 * 2026-08-08) — a separate concern from the page split above.
 */
import { prisma } from "@/lib/prisma";

export type PlanTier = "basic" | "pro" | "ultimate";
export const PLAN_TIERS: PlanTier[] = ["basic", "pro", "ultimate"];

export type PartnerTypeRecord = {
  id: string;
  description: string;
  defaultModules: string[];
  assignableRoleIds: string[];
  /** pageId -> tier that unlocks it, scoped to this type's own defaultModules pages only. */
  planTierByPage: Record<string, PlanTier>;
  /** Which of the 3 real Plan ids (Basic/Pro/Ultimate pricing) this type bundles/offers at signup. */
  planIds: string[];
  /** Prefix used for this type's Partner.id values (e.g. "VND" -> VND0001, "SC" -> SC0001). Each distinct prefix gets its own independent sequence — see src/lib/partnerData.ts. Defaults to "VND". */
  idPrefix: string;
  /** When true, signups against this type go to a review queue instead of getting an id immediately. */
  requiresApproval: boolean;
  status: string;
};

function toRecord(row: {
  id: string;
  description: string | null;
  defaultModules: unknown;
  assignableRoleIds: unknown;
  planTierByPage: unknown;
  planIds: unknown;
  idPrefix: string;
  requiresApproval: boolean;
  status: string;
}): PartnerTypeRecord {
  return {
    id: row.id,
    description: row.description ?? "",
    defaultModules: (row.defaultModules as string[] | null) ?? [],
    assignableRoleIds: (row.assignableRoleIds as string[] | null) ?? [],
    planTierByPage: (row.planTierByPage as Record<string, PlanTier> | null) ?? {},
    planIds: (row.planIds as string[] | null) ?? [],
    idPrefix: row.idPrefix || "VND",
    requiresApproval: row.requiresApproval,
    status: row.status,
  };
}

export async function listPartnerTypes(): Promise<PartnerTypeRecord[]> {
  const rows = await prisma.partnerType.findMany({ orderBy: { id: "asc" } });
  return rows.map(toRecord);
}

export async function listActivePartnerTypes(): Promise<PartnerTypeRecord[]> {
  const rows = await prisma.partnerType.findMany({ where: { status: "Active" }, orderBy: { id: "asc" } });
  return rows.map(toRecord);
}

export async function getPartnerType(id: string): Promise<PartnerTypeRecord | undefined> {
  const row = await prisma.partnerType.findUnique({ where: { id } });
  return row ? toRecord(row) : undefined;
}

export type PartnerTypeInput = {
  description: string;
  defaultModules: string[];
  assignableRoleIds: string[];
  planTierByPage: Record<string, PlanTier>;
  planIds: string[];
  idPrefix?: string;
  requiresApproval: boolean;
  status: string;
};

export async function createPartnerType(id: string, data: PartnerTypeInput): Promise<void> {
  await prisma.partnerType.create({ data: { id, ...data } });
}

export async function updatePartnerType(id: string, data: PartnerTypeInput): Promise<void> {
  await prisma.partnerType.update({ where: { id }, data });
}

export async function deletePartnerType(id: string): Promise<void> {
  await prisma.partnerType.delete({ where: { id } });
}
