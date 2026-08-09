/**
 * Vendor Types — real Prisma-backed store (`VendorType` table). The
 * top-level entity a vendor account is created against; bundles a default
 * module set, which Roles are assignable, its OWN Basic/Pro/Ultimate PAGE
 * breakdown (planTierByPage — every type proposes its own page split,
 * confirmed 2026-08-08), and which of the 3 real Plan price points
 * (src/lib/plansData.ts) it bundles for actual billing (planIds, added
 * 2026-08-08) — a separate concern from the page split above.
 */
import { prisma } from "@/lib/prisma";

export type PlanTier = "basic" | "pro" | "ultimate";
export const PLAN_TIERS: PlanTier[] = ["basic", "pro", "ultimate"];

export type VendorTypeRecord = {
  id: string;
  description: string;
  defaultModules: string[];
  assignableRoleIds: string[];
  /** pageId -> tier that unlocks it, scoped to this type's own defaultModules pages only. */
  planTierByPage: Record<string, PlanTier>;
  /** Which of the 3 real Plan ids (Basic/Pro/Ultimate pricing) this type bundles/offers at signup. */
  planIds: string[];
  /** When true, signups against this type go to a review queue instead of getting a VND#### id immediately. */
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
  requiresApproval: boolean;
  status: string;
}): VendorTypeRecord {
  return {
    id: row.id,
    description: row.description ?? "",
    defaultModules: (row.defaultModules as string[] | null) ?? [],
    assignableRoleIds: (row.assignableRoleIds as string[] | null) ?? [],
    planTierByPage: (row.planTierByPage as Record<string, PlanTier> | null) ?? {},
    planIds: (row.planIds as string[] | null) ?? [],
    requiresApproval: row.requiresApproval,
    status: row.status,
  };
}

export async function listVendorTypes(): Promise<VendorTypeRecord[]> {
  const rows = await prisma.vendorType.findMany({ orderBy: { id: "asc" } });
  return rows.map(toRecord);
}

export async function listActiveVendorTypes(): Promise<VendorTypeRecord[]> {
  const rows = await prisma.vendorType.findMany({ where: { status: "Active" }, orderBy: { id: "asc" } });
  return rows.map(toRecord);
}

export async function getVendorType(id: string): Promise<VendorTypeRecord | undefined> {
  const row = await prisma.vendorType.findUnique({ where: { id } });
  return row ? toRecord(row) : undefined;
}

export type VendorTypeInput = {
  description: string;
  defaultModules: string[];
  assignableRoleIds: string[];
  planTierByPage: Record<string, PlanTier>;
  planIds: string[];
  requiresApproval: boolean;
  status: string;
};

export async function createVendorType(id: string, data: VendorTypeInput): Promise<void> {
  await prisma.vendorType.create({ data: { id, ...data } });
}

export async function updateVendorType(id: string, data: VendorTypeInput): Promise<void> {
  await prisma.vendorType.update({ where: { id }, data });
}

export async function deleteVendorType(id: string): Promise<void> {
  await prisma.vendorType.delete({ where: { id } });
}
