/**
 * Vendor Types — real Prisma-backed store (`VendorType` table). The
 * top-level entity a vendor account is created against; bundles a default
 * module set, which Roles are assignable, and its OWN Basic/Pro/Ultimate
 * page-tier breakdown (never a shared global Plan membership list — every
 * type proposes its own three tiers, confirmed 2026-08-08).
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
  status: string;
};

function toRecord(row: {
  id: string;
  description: string | null;
  defaultModules: unknown;
  assignableRoleIds: unknown;
  planTierByPage: unknown;
  status: string;
}): VendorTypeRecord {
  return {
    id: row.id,
    description: row.description ?? "",
    defaultModules: (row.defaultModules as string[] | null) ?? [],
    assignableRoleIds: (row.assignableRoleIds as string[] | null) ?? [],
    planTierByPage: (row.planTierByPage as Record<string, PlanTier> | null) ?? {},
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
