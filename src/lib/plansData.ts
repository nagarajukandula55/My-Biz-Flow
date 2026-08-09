/**
 * Subscription Plans — real Prisma-backed store (`Plan` table). Super-Admin
 * configurable via /admin/plans; the single source of truth for the public
 * /pricing page, so pricing can never drift from what Super Admin set.
 */
import { prisma } from "@/lib/prisma";

export type PlanRecord = {
  id: string;
  name: string;
  price: number;
  billingCycle: "monthly" | "yearly";
  includedModuleSlugs: string[];
  maxUsers: number;
  maxLocations: number;
  isPublic: boolean;
};

function toRecord(row: {
  id: string;
  name: string;
  price: number;
  billingCycle: string;
  includedModuleSlugs: unknown;
  maxUsers: number;
  maxLocations: number;
  isPublic: boolean;
}): PlanRecord {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    billingCycle: row.billingCycle as "monthly" | "yearly",
    includedModuleSlugs: (row.includedModuleSlugs as string[] | null) ?? [],
    maxUsers: row.maxUsers,
    maxLocations: row.maxLocations,
    isPublic: row.isPublic,
  };
}

export async function listPlans(): Promise<PlanRecord[]> {
  const rows = await prisma.plan.findMany({ orderBy: { price: "asc" } });
  return rows.map(toRecord);
}

export async function listPublicPlans(): Promise<PlanRecord[]> {
  const rows = await prisma.plan.findMany({ where: { isPublic: true }, orderBy: { price: "asc" } });
  return rows.map(toRecord);
}

export async function getPlan(id: string): Promise<PlanRecord | undefined> {
  const row = await prisma.plan.findUnique({ where: { id } });
  return row ? toRecord(row) : undefined;
}

export type PlanInput = {
  name: string;
  price: number;
  billingCycle: "monthly" | "yearly";
  includedModuleSlugs: string[];
  maxUsers: number;
  maxLocations: number;
  isPublic: boolean;
};

export async function createPlan(id: string, data: PlanInput): Promise<void> {
  await prisma.plan.create({ data: { id, ...data } });
}

export async function updatePlan(id: string, data: PlanInput): Promise<void> {
  await prisma.plan.update({ where: { id }, data });
}

export async function deletePlan(id: string): Promise<void> {
  await prisma.plan.delete({ where: { id } });
}
