"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createPlan, updatePlan, type BillingCycle } from "@/lib/subscriptions";

function toInput(values: Record<string, unknown>) {
  return {
    name: String(values["name"] ?? "").trim(),
    billingCycle: (String(values["billingCycle"] ?? "Monthly") as BillingCycle),
    planAmount: Math.round((Number(values["planAmountRupees"]) || 0) * 100),
    isActive: values["isActive"] === undefined ? true : Boolean(values["isActive"]),
  };
}

export async function createPlanAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const input = toInput(values);
  if (!input.name) return { error: "Plan name is required." };
  const plan = await createPlan(partnerId, input);
  revalidatePath(`/partner/${partnerId}/subscriptions/plans`);
  redirect(`/partner/${partnerId}/subscriptions/plans/${plan.id}`);
}

export async function updatePlanAction(
  partnerId: string,
  planId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const input = toInput(values);
  if (!input.name) return { error: "Plan name is required." };
  await updatePlan(partnerId, planId, input);
  revalidatePath(`/partner/${partnerId}/subscriptions/plans`);
  revalidatePath(`/partner/${partnerId}/subscriptions/plans/${planId}`);
  redirect(`/partner/${partnerId}/subscriptions/plans/${planId}`);
}
