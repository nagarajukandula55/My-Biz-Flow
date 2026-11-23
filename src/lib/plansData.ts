/**
 * Subscription Plans — real Prisma-backed store (`Plan` table). Super-Admin
 * configurable via /admin/plans; the single source of truth for the public
 * /pricing page, so pricing can never drift from what Super Admin set.
 */
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

export type PlanRecord = {
  id: string;
  name: string;
  price: number;
  /** Bare-minimum introductory monthly rate, active until LAUNCH_PRICING_CUTOVER (src/lib/subscriptionData.ts) -- null means this plan has no launch discount. */
  launchPrice: number | null;
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
  launchPrice: number | null;
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
    launchPrice: row.launchPrice,
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

async function loadPublicPlans(): Promise<PlanRecord[]> {
  const rows = await prisma.plan.findMany({ where: { isPublic: true }, orderBy: { price: "asc" } });
  return rows.map(toRecord);
}

const listPublicPlansCached = unstable_cache(loadPublicPlans,
  ["public-plans"], { revalidate: 600, tags: ["public-plans"] });

export async function listPublicPlans(): Promise<PlanRecord[]> {
  try {
    return await listPublicPlansCached();
  } catch (error) {
    if (error instanceof Error && error.message.includes("incrementalCache missing")) {
      return loadPublicPlans();
    }
    throw error;
  }
}

export async function getPlan(id: string): Promise<PlanRecord | undefined> {
  const row = await prisma.plan.findUnique({ where: { id } });
  return row ? toRecord(row) : undefined;
}

export type PlanInput = {
  name: string;
  price: number;
  launchPrice?: number | null;
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
