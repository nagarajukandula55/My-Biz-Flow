/**
 * Data-access layer for the Subscriptions / Membership module's Prisma-backed
 * tables (SubscriptionPlan, Subscriber — see prisma/schema.prisma's
 * "Subscriptions" block, migration 20260925180000). Replaces the previous
 * BusinessRecord-backed ("subscriptions" moduleSlug) storage — same
 * conversion pattern as src/lib/clinic.ts (the reference this file follows:
 * tenant-scoped list/get/create/update, redirect-driven server actions in
 * each route's actions.ts).
 *
 * Relationship modeled: SubscriptionPlan 1--* Subscriber (planId is nullable
 * — a Subscriber can be created with a free-standing plan snapshot
 * (billingCycle/planAmount copied at creation time) even if no
 * SubscriptionPlan catalog entry is selected, matching the schema's own
 * doc comment that Subscriber carries its own billingCycle/planAmount
 * rather than always deriving them from `plan`).
 *
 * planAmount is Int paise on both models, matching every other money field
 * in this schema; callers that work in rupees (forms) convert at the
 * boundary.
 */
import { prisma } from "@/lib/prisma";
import { createBusinessRecord } from "@/lib/businessRecords";
import { assertPartnerCanWrite } from "@/lib/tenant";
import { assertRecordModuleAccess } from "@/lib/recordEntitlement";
import { withRecordLock } from "@/lib/withRecordLock";

async function readAccess(partnerId: string) {
  await assertRecordModuleAccess(partnerId, "subscriptions");
}

async function writeAccess(partnerId: string) {
  await readAccess(partnerId);
  await assertPartnerCanWrite(partnerId);
}

export type BillingCycle = "Monthly" | "Quarterly" | "Yearly";
export const BILLING_CYCLES: BillingCycle[] = ["Monthly", "Quarterly", "Yearly"];
export const CYCLE_MONTHS: Record<BillingCycle, number> = {
  Monthly: 1,
  Quarterly: 3,
  Yearly: 12,
};

export type SubscriberStatus = "Active" | "Paused" | "Expired" | "Cancelled";
export const SUBSCRIBER_STATUSES: SubscriberStatus[] = ["Active", "Paused", "Expired", "Cancelled"];

/** Adds `months` calendar months to a Date, returned as a new Date. */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

// --- Plans --------------------------------------------------------------

export async function listPlans(partnerId: string) {
  await readAccess(partnerId);
  return prisma.subscriptionPlan.findMany({ where: { partnerId }, orderBy: { name: "asc" } });
}

export async function getPlan(partnerId: string, id: string) {
  await readAccess(partnerId);
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!plan || plan.partnerId !== partnerId) return null;
  return plan;
}

export type PlanInput = {
  name: string;
  billingCycle: BillingCycle;
  planAmount: number; // paise
  isActive?: boolean;
};

function validatePlanInput(data: PlanInput) {
  if (!data.name.trim()) throw new Error("Plan name is required.");
  if (!BILLING_CYCLES.includes(data.billingCycle)) throw new Error("Select a valid billing cycle.");
  if (!Number.isSafeInteger(data.planAmount) || data.planAmount < 0) throw new Error("Plan amount must be a non-negative amount in paise.");
}

export async function createPlan(partnerId: string, data: PlanInput) {
  await writeAccess(partnerId);
  validatePlanInput(data);
  return prisma.subscriptionPlan.create({
    data: {
      partnerId,
      name: data.name.trim(),
      billingCycle: data.billingCycle,
      planAmount: data.planAmount,
      isActive: data.isActive ?? true,
    },
  });
}

export async function updatePlan(partnerId: string, id: string, data: PlanInput) {
  await writeAccess(partnerId);
  validatePlanInput(data);
  const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!existing || existing.partnerId !== partnerId) throw new Error("Plan not found.");
  return prisma.subscriptionPlan.update({
    where: { id },
    data: {
      name: data.name.trim(),
      billingCycle: data.billingCycle,
      planAmount: data.planAmount,
      isActive: data.isActive ?? existing.isActive,
    },
  });
}

// --- Subscribers ----------------------------------------------------------

export async function listSubscribers(partnerId: string) {
  await readAccess(partnerId);
  return prisma.subscriber.findMany({
    where: { partnerId },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });
}

export async function getSubscriber(partnerId: string, id: string) {
  await readAccess(partnerId);
  const subscriber = await prisma.subscriber.findUnique({ where: { id }, include: { plan: true } });
  if (!subscriber || subscriber.partnerId !== partnerId) return null;
  return subscriber;
}

export type SubscriberInput = {
  memberName: string;
  planId?: string | null;
  billingCycle: BillingCycle;
  planAmount: number; // paise
  startDate?: Date;
  status?: SubscriberStatus;
};

function validateSubscriberInput(data: SubscriberInput) {
  if (!data.memberName.trim()) throw new Error("Member name is required.");
  if (!BILLING_CYCLES.includes(data.billingCycle)) throw new Error("Select a valid billing cycle.");
  if (!Number.isSafeInteger(data.planAmount) || data.planAmount < 0) throw new Error("Membership amount must be a non-negative amount in paise.");
  if (data.startDate && !Number.isFinite(data.startDate.getTime())) throw new Error("Select a valid start date.");
  if (data.status && !SUBSCRIBER_STATUSES.includes(data.status)) throw new Error("Select a valid membership status.");
}

async function assertSelectedPlan(partnerId: string, planId?: string | null, existingPlanId?: string | null) {
  if (!planId) return;
  const plan = await prisma.subscriptionPlan.findFirst({ where: { id: planId, partnerId } });
  if (!plan || (!plan.isActive && plan.id !== existingPlanId)) throw new Error("Select an active plan belonging to this business.");
}

export async function createSubscriber(partnerId: string, data: SubscriberInput) {
  await writeAccess(partnerId);
  validateSubscriberInput(data);
  await assertSelectedPlan(partnerId, data.planId);
  const startDate = data.startDate ?? new Date();
  const nextBillingDate = addMonths(startDate, CYCLE_MONTHS[data.billingCycle]);
  return prisma.subscriber.create({
    data: {
      partnerId,
      planId: data.planId || null,
      memberName: data.memberName.trim(),
      billingCycle: data.billingCycle,
      planAmount: data.planAmount,
      startDate,
      nextBillingDate,
      status: data.status ?? "Active",
    },
  });
}

export async function updateSubscriber(partnerId: string, id: string, data: SubscriberInput) {
  await writeAccess(partnerId);
  validateSubscriberInput(data);
  const existing = await prisma.subscriber.findUnique({ where: { id } });
  if (!existing || existing.partnerId !== partnerId) throw new Error("Subscriber not found.");
  await assertSelectedPlan(partnerId, data.planId, existing.planId);
  const startDate = data.startDate ?? existing.startDate ?? new Date();
  return prisma.subscriber.update({
    where: { id },
    data: {
      planId: data.planId || null,
      memberName: data.memberName.trim(),
      billingCycle: data.billingCycle,
      planAmount: data.planAmount,
      startDate,
      status: data.status ?? existing.status,
    },
  });
}

export async function deleteSubscriber(partnerId: string, id: string): Promise<void> {
  await writeAccess(partnerId);
  const existing = await prisma.subscriber.findUnique({ where: { id } });
  if (!existing || existing.partnerId !== partnerId) return;
  await prisma.subscriber.delete({ where: { id } });
}

// --- Billing/lifecycle actions --------------------------------------------

type CheckIn = { timestamp: string };

function readCheckIns(value: unknown): CheckIn[] {
  return Array.isArray(value) ? (value as CheckIn[]) : [];
}

function readInvoiceIds(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}

/**
 * Records a payment for the subscriber's current billing cycle: creates a
 * real Billing invoice for the cycle amount (never trusts client-submitted
 * amounts — always uses the server-held planAmount) and advances
 * nextBillingDate by one cycle. Mirrors clinic.ts's
 * createInvoiceFromAppointment / the previous BusinessRecord-era
 * recordPaymentAction exactly (same Billing shape).
 */
export async function recordSubscriberPayment(partnerId: string, id: string, expectedCycleDate: string, paymentMode: string): Promise<void> {
  await writeAccess(partnerId);
  await assertRecordModuleAccess(partnerId, "billing");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expectedCycleDate)) throw new Error("Refresh the membership before recording payment.");
  if (!["Cash", "UPI", "Card", "Bank Transfer"].includes(paymentMode)) throw new Error("Select the payment method used.");

  // All cooperating Prisma operations participate in the advisory-lock
  // transaction. An invoice and cycle advance commit together or roll back.
  await withRecordLock("subscription-payment", `${partnerId}:${id}`, async () => {
    const subscriber = await prisma.subscriber.findFirst({ where: { id, partnerId } });
    if (!subscriber) throw new Error("Membership not found");
    if (subscriber.status !== "Active") throw new Error("Only an active membership can record payment.");
    if (subscriber.nextBillingDate?.toISOString().slice(0, 10) !== expectedCycleDate) {
      throw new Error("This billing cycle has changed. Refresh the membership before recording another payment.");
    }
    if (!Number.isSafeInteger(subscriber.planAmount) || subscriber.planAmount <= 0) {
      throw new Error("Set a valid positive membership amount before recording payment.");
    }
    if (!BILLING_CYCLES.includes(subscriber.billingCycle as BillingCycle)) throw new Error("Membership billing cycle is invalid.");
    const cycleAmountRupees = subscriber.planAmount / 100;
    const today = new Date().toISOString().slice(0, 10);
    const invoice = await createBusinessRecord(partnerId, "billing", {
      customer: subscriber.memberName,
      issueDate: today,
      dueDate: today,
      lineItemsSummary: `Membership - ${subscriber.billingCycle} cycle`,
      subtotal: cycleAmountRupees,
      taxAmount: 0,
      totalAmount: cycleAmountRupees,
      paymentStatus: "Paid",
      paymentMode,
      sourceSubscriberId: subscriber.id,
      sourceBillingCycleDate: expectedCycleDate,
    });
    const nextBillingDate = addMonths(subscriber.nextBillingDate, CYCLE_MONTHS[subscriber.billingCycle as BillingCycle]);
    await prisma.subscriber.update({
      where: { id },
      data: { nextBillingDate, invoiceIds: [...readInvoiceIds(subscriber.invoiceIds), String(invoice.id)] },
    });
  });
}

/** Freezes a subscriber — billing stops tracking until Resume is called. */
export async function freezeSubscriber(partnerId: string, id: string, resumeDate?: Date): Promise<void> {
  await writeAccess(partnerId);
  const subscriber = await prisma.subscriber.findUnique({ where: { id } });
  if (!subscriber || subscriber.partnerId !== partnerId) return;
  await prisma.subscriber.update({
    where: { id },
    data: {
      status: "Paused",
      frozenAt: new Date(),
      resumeDate: resumeDate ?? null,
    },
  });
}

/** Resumes a frozen subscriber and recalculates nextBillingDate from the resume point. */
export async function resumeSubscriber(partnerId: string, id: string): Promise<void> {
  await writeAccess(partnerId);
  const subscriber = await prisma.subscriber.findUnique({ where: { id } });
  if (!subscriber || subscriber.partnerId !== partnerId) return;
  const resumeFrom = subscriber.resumeDate ?? new Date();
  const nextBillingDate = addMonths(resumeFrom, CYCLE_MONTHS[subscriber.billingCycle as BillingCycle]);

  await prisma.subscriber.update({
    where: { id },
    data: {
      status: "Active",
      nextBillingDate,
      frozenAt: null,
      resumeDate: null,
    },
  });
}

/** Logs a check-in timestamp for gym-style usage tracking on an active subscriber. */
export async function checkInSubscriber(partnerId: string, id: string): Promise<void> {
  await writeAccess(partnerId);
  const subscriber = await prisma.subscriber.findUnique({ where: { id } });
  if (!subscriber || subscriber.partnerId !== partnerId) return;
  if (subscriber.status !== "Active") throw new Error("Only active memberships can check in");

  const checkIns = [...readCheckIns(subscriber.checkIns), { timestamp: new Date().toISOString() }];
  await prisma.subscriber.update({ where: { id }, data: { checkIns } });
}

export function formatPaise(paise: number): string {
  return `Rs ${(paise / 100).toLocaleString("en-IN")}`;
}
