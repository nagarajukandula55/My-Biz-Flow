"use server";

import { revalidatePath } from "next/cache";
import { createBusinessRecord, getBusinessRecord, updateBusinessRecord } from "@/lib/businessRecords";
import { addMonths, CYCLE_MONTHS, extractMembershipFromRecord, type BillingCycle } from "@/lib/sample-data/subscriptions";

/**
 * Records a payment for the membership's current billing cycle: creates a
 * real Billing invoice for the cycle amount (never trusts client-submitted
 * amounts — always uses the server-held planAmount) and advances
 * nextBillingDate by one cycle. Mirrors POS's completeSaleAction pattern of
 * "recompute + persist + create invoice" for a real money-moving action.
 */
export async function recordPaymentAction(partnerId: string, membershipId: string): Promise<void> {
  const record = await getBusinessRecord(partnerId, "subscriptions", membershipId);
  if (!record) throw new Error("Membership not found");
  const membership = extractMembershipFromRecord(record);
  if (membership.status === "Paused") throw new Error("Membership is frozen — resume it before recording a payment");
  if (membership.status === "Cancelled") throw new Error("Membership is cancelled");

  const cycleAmount = membership.planAmount;
  const invoice = await createBusinessRecord(partnerId, "billing", {
    customer: membership.memberName,
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date().toISOString().slice(0, 10),
    lineItemsSummary: `${membership.plan} membership — ${membership.billingCycle} cycle`,
    subtotal: cycleAmount,
    taxAmount: 0,
    totalAmount: cycleAmount,
    paymentStatus: "Paid",
    paymentMode: "Auto-charge",
    sourceMembershipId: membership.id,
  });

  const base = membership.nextBillingDate || membership.startDate || new Date().toISOString().slice(0, 10);
  const nextBillingDate = addMonths(base, CYCLE_MONTHS[membership.billingCycle]);

  await updateBusinessRecord(partnerId, "subscriptions", membershipId, {
    ...record,
    status: "Active",
    nextBillingDate,
    renewalDate: nextBillingDate,
    lastPaymentDate: new Date().toISOString().slice(0, 10),
    invoiceIds: [...(membership.invoiceIds ?? []), String(invoice.id)],
  });

  revalidatePath(`/partner/${partnerId}/subscriptions/${membershipId}`);
  revalidatePath(`/partner/${partnerId}/subscriptions`);
}

/** Freezes a membership — billing stops tracking until Resume is called. */
export async function freezeMembershipAction(partnerId: string, membershipId: string, resumeDate?: string): Promise<void> {
  const record = await getBusinessRecord(partnerId, "subscriptions", membershipId);
  if (!record) return;
  await updateBusinessRecord(partnerId, "subscriptions", membershipId, {
    ...record,
    status: "Paused",
    frozenAt: new Date().toISOString(),
    resumeDate: resumeDate || undefined,
  });
  revalidatePath(`/partner/${partnerId}/subscriptions/${membershipId}`);
  revalidatePath(`/partner/${partnerId}/subscriptions`);
}

/** Resumes a frozen membership and recalculates nextBillingDate from the resume point. */
export async function resumeMembershipAction(partnerId: string, membershipId: string): Promise<void> {
  const record = await getBusinessRecord(partnerId, "subscriptions", membershipId);
  if (!record) return;
  const membership = extractMembershipFromRecord(record);
  const resumeFrom = membership.resumeDate || new Date().toISOString().slice(0, 10);
  const nextBillingDate = addMonths(resumeFrom, CYCLE_MONTHS[membership.billingCycle]);

  await updateBusinessRecord(partnerId, "subscriptions", membershipId, {
    ...record,
    status: "Active",
    nextBillingDate,
    renewalDate: nextBillingDate,
    frozenAt: undefined,
    resumeDate: undefined,
  });
  revalidatePath(`/partner/${partnerId}/subscriptions/${membershipId}`);
  revalidatePath(`/partner/${partnerId}/subscriptions`);
}

/** Logs a check-in timestamp for gym-style usage tracking on an active membership. */
export async function checkInAction(partnerId: string, membershipId: string): Promise<void> {
  const record = await getBusinessRecord(partnerId, "subscriptions", membershipId);
  if (!record) return;
  const membership = extractMembershipFromRecord(record);
  if (membership.status !== "Active") throw new Error("Only active memberships can check in");

  const checkIns = [...membership.checkIns, { timestamp: new Date().toISOString() }];
  await updateBusinessRecord(partnerId, "subscriptions", membershipId, {
    ...record,
    checkIns,
    lastCheckIn: new Date().toISOString().slice(0, 10),
  });
  revalidatePath(`/partner/${partnerId}/subscriptions/${membershipId}`);
}

export async function setBillingCycleAction(partnerId: string, membershipId: string, billingCycle: BillingCycle): Promise<void> {
  const record = await getBusinessRecord(partnerId, "subscriptions", membershipId);
  if (!record) return;
  await updateBusinessRecord(partnerId, "subscriptions", membershipId, { ...record, billingCycle });
  revalidatePath(`/partner/${partnerId}/subscriptions/${membershipId}`);
}
