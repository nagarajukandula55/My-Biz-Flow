"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import {
  createSubscriber,
  updateSubscriber,
  deleteSubscriber,
  recordSubscriberPayment,
  freezeSubscriber,
  resumeSubscriber,
  checkInSubscriber,
  type BillingCycle,
} from "@/lib/subscriptions";

function toInput(values: Record<string, unknown>) {
  return {
    memberName: String(values["memberName"] ?? "").trim(),
    planId: values["planId"] ? String(values["planId"]) : undefined,
    billingCycle: (String(values["billingCycle"] ?? "Monthly") as BillingCycle),
    planAmount: Math.round((Number(values["planAmountRupees"]) || 0) * 100),
    startDate: values["startDate"] ? new Date(String(values["startDate"])) : undefined,
  };
}

/**
 * Bind with .bind(null, partnerId) before passing as RecordForm's `action`
 * prop — the return shape (`void | { error }`) matches RecordFormAction
 * exactly; a successful save redirects and never returns.
 */
export async function createSubscriberAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const input = toInput(values);
  if (!input.memberName) return { error: "Member name is required." };
  const subscriber = await createSubscriber(partnerId, input);
  revalidatePath(`/partner/${partnerId}/subscriptions`);
  redirect(`/partner/${partnerId}/subscriptions/${subscriber.id}`);
}

/** Bind with .bind(null, partnerId, subscriberId). */
export async function updateSubscriberAction(
  partnerId: string,
  subscriberId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const input = toInput(values);
  if (!input.memberName) return { error: "Member name is required." };
  await updateSubscriber(partnerId, subscriberId, input);
  revalidatePath(`/partner/${partnerId}/subscriptions`);
  revalidatePath(`/partner/${partnerId}/subscriptions/${subscriberId}`);
  redirect(`/partner/${partnerId}/subscriptions/${subscriberId}`);
}

export async function deleteSubscriberAction(partnerId: string, subscriberId: string): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  await deleteSubscriber(partnerId, subscriberId);
  revalidatePath(`/partner/${partnerId}/subscriptions`);
  redirect(`/partner/${partnerId}/subscriptions`);
}

/**
 * Records a payment for the membership's current billing cycle: creates a
 * real Billing invoice for the cycle amount (never trusts client-submitted
 * amounts — always uses the server-held planAmount) and advances
 * nextBillingDate by one cycle.
 */
export async function recordPaymentAction(partnerId: string, membershipId: string): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  await recordSubscriberPayment(partnerId, membershipId);
  revalidatePath(`/partner/${partnerId}/subscriptions/${membershipId}`);
  revalidatePath(`/partner/${partnerId}/subscriptions`);
}

/** Freezes a membership — billing stops tracking until Resume is called. */
export async function freezeMembershipAction(partnerId: string, membershipId: string, resumeDate?: string): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  await freezeSubscriber(partnerId, membershipId, resumeDate ? new Date(resumeDate) : undefined);
  revalidatePath(`/partner/${partnerId}/subscriptions/${membershipId}`);
  revalidatePath(`/partner/${partnerId}/subscriptions`);
}

/** Resumes a frozen membership and recalculates nextBillingDate from the resume point. */
export async function resumeMembershipAction(partnerId: string, membershipId: string): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  await resumeSubscriber(partnerId, membershipId);
  revalidatePath(`/partner/${partnerId}/subscriptions/${membershipId}`);
  revalidatePath(`/partner/${partnerId}/subscriptions`);
}

/** Logs a check-in timestamp for gym-style usage tracking on an active membership. */
export async function checkInAction(partnerId: string, membershipId: string): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  await checkInSubscriber(partnerId, membershipId);
  revalidatePath(`/partner/${partnerId}/subscriptions/${membershipId}`);
}
