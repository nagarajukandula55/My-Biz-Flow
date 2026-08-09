"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createPlan, updatePlan, deletePlan, type PlanInput } from "@/lib/plansData";

function parseInput(values: Record<string, unknown>): PlanInput {
  return {
    name: String(values.name ?? "").trim(),
    price: Number(values.price ?? 0),
    billingCycle: (values.billingCycle as "monthly" | "yearly") ?? "monthly",
    includedModuleSlugs: Array.isArray(values.includedModuleSlugs) ? (values.includedModuleSlugs as string[]) : [],
    maxUsers: Number(values.maxUsers ?? 0),
    maxLocations: Number(values.maxLocations ?? 0),
    isPublic: Boolean(values.isPublic),
  };
}

export async function createPlanAction(values: Record<string, unknown>) {
  const planId = String(values.id ?? "").trim();
  if (!planId) throw new Error("Plan ID is required");
  await createPlan(planId, parseInput(values));
  revalidatePath("/admin/plans");
  revalidatePath("/pricing");
  redirect("/admin/plans");
}

export async function updatePlanAction(planId: string, values: Record<string, unknown>) {
  await updatePlan(planId, parseInput(values));
  revalidatePath("/admin/plans");
  revalidatePath(`/admin/plans/${planId}`);
  revalidatePath("/pricing");
  redirect(`/admin/plans/${planId}`);
}

export async function deletePlanAction(planId: string) {
  await deletePlan(planId);
  revalidatePath("/admin/plans");
  revalidatePath("/pricing");
}
