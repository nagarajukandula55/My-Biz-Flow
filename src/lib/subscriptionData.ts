/**
 * Subscription lifecycle helpers: trial-state derivation, billing-cycle
 * pricing math, and real Offer (discount/combo) CRUD — Prisma-backed
 * (`Offer` table). Cycle pricing is computed from each Plan's monthly
 * price (src/lib/plansData.ts) rather than stored per-cycle, so adding a
 * new cycle or adjusting the multiplier is a one-place change.
 *
 * There is no payment gateway wired up here (same documented gap as
 * central-api, see CLAUDE.md) — a trial rolling past trialEndAt just
 * flips the derived status to "Trial Expired" for display; actually
 * collecting payment and moving PastDue -> Active is a manual Super
 * Admin action for now (see /admin/subscribers/[vendorId]/subscription).
 */
import { prisma } from "@/lib/prisma";
import type { VendorRecord } from "@/lib/vendorData";
import { getPlan } from "@/lib/plansData";

export type BillingCycle = "Monthly" | "Quarterly" | "HalfYearly" | "Yearly";
export const BILLING_CYCLES: BillingCycle[] = ["Monthly", "Quarterly", "HalfYearly", "Yearly"];

/** Months per cycle, and a discount off straight monthly*months for committing longer. */
const CYCLE_MONTHS: Record<BillingCycle, number> = { Monthly: 1, Quarterly: 3, HalfYearly: 6, Yearly: 12 };
const CYCLE_DISCOUNT: Record<BillingCycle, number> = { Monthly: 0, Quarterly: 0.05, HalfYearly: 0.1, Yearly: 0.2 };

export function cycleLabel(cycle: BillingCycle): string {
  return { Monthly: "Monthly", Quarterly: "Quarterly", HalfYearly: "Half-Yearly", Yearly: "Yearly" }[cycle];
}

/** A Plan's price for one billing cycle, before any Offer discount. */
export function computeCyclePrice(monthlyPrice: number, cycle: BillingCycle): number {
  const months = CYCLE_MONTHS[cycle];
  const discount = CYCLE_DISCOUNT[cycle];
  return Math.round(monthlyPrice * months * (1 - discount));
}

export type OfferRecord = {
  id: string;
  name: string;
  description: string;
  discountType: string;
  discountValue: number;
  planIds: string[];
  billingCycles: string[];
  isCombo: boolean;
  isActive: boolean;
  validFrom: Date | null;
  validTo: Date | null;
};

function toOfferRecord(row: {
  id: string;
  name: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  planIds: unknown;
  billingCycles: unknown;
  isCombo: boolean;
  isActive: boolean;
  validFrom: Date | null;
  validTo: Date | null;
}): OfferRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    discountType: row.discountType,
    discountValue: row.discountValue,
    planIds: (row.planIds as string[] | null) ?? [],
    billingCycles: (row.billingCycles as string[] | null) ?? [],
    isCombo: row.isCombo,
    isActive: row.isActive,
    validFrom: row.validFrom,
    validTo: row.validTo,
  };
}

export type OfferInput = {
  name: string;
  description: string;
  discountType: string;
  discountValue: number;
  planIds: string[];
  billingCycles: string[];
  isCombo: boolean;
  isActive: boolean;
  validFrom: Date | null;
  validTo: Date | null;
};

export async function listOffers(): Promise<OfferRecord[]> {
  const rows = await prisma.offer.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toOfferRecord);
}

export async function listActiveOffers(): Promise<OfferRecord[]> {
  const now = new Date();
  const rows = await prisma.offer.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" } });
  return rows
    .map(toOfferRecord)
    .filter((o) => (!o.validFrom || o.validFrom <= now) && (!o.validTo || o.validTo >= now));
}

export async function getOffer(id: string): Promise<OfferRecord | undefined> {
  const row = await prisma.offer.findUnique({ where: { id } });
  return row ? toOfferRecord(row) : undefined;
}

export async function createOffer(data: OfferInput): Promise<OfferRecord> {
  const row = await prisma.offer.create({ data });
  return toOfferRecord(row);
}

export async function updateOffer(id: string, data: OfferInput): Promise<void> {
  await prisma.offer.update({ where: { id }, data });
}

export async function deleteOffer(id: string): Promise<void> {
  await prisma.offer.delete({ where: { id } });
}

/** Applies an Offer's discount to a computed cycle price, if the offer applies to that plan/cycle and is currently valid. */
export function applyOfferDiscount(cyclePrice: number, offer: OfferRecord | undefined, planId: string, cycle: BillingCycle): number {
  if (!offer || !offer.isActive) return cyclePrice;
  if (offer.planIds.length > 0 && !offer.planIds.includes(planId)) return cyclePrice;
  if (offer.billingCycles.length > 0 && !offer.billingCycles.includes(cycle)) return cyclePrice;
  const now = new Date();
  if (offer.validFrom && offer.validFrom > now) return cyclePrice;
  if (offer.validTo && offer.validTo < now) return cyclePrice;
  if (offer.discountType === "flat") return Math.max(0, cyclePrice - offer.discountValue);
  return Math.round(cyclePrice * (1 - offer.discountValue / 100));
}

/** The rupee amount due for a vendor's currently chosen plan+cycle+offer — used to create the Razorpay order. */
export async function computeVendorDueAmount(vendor: VendorRecord): Promise<{ amount: number; planName: string } | undefined> {
  if (!vendor.planId || !vendor.billingCycle) return undefined;
  const plan = await getPlan(vendor.planId);
  if (!plan) return undefined;
  const cycle = vendor.billingCycle as BillingCycle;
  const cyclePrice = computeCyclePrice(plan.price, cycle);
  const offer = vendor.offerId ? await getOffer(vendor.offerId) : undefined;
  const amount = applyOfferDiscount(cyclePrice, offer, plan.id, cycle);
  return { amount, planName: plan.name };
}

export type SubscriptionState = {
  status: string;
  daysLeftInTrial: number | null;
  isTrialExpired: boolean;
};

/** Derives a display-friendly subscription state from a Vendor row — does not mutate anything. */
export function getSubscriptionState(vendor: VendorRecord): SubscriptionState {
  if (vendor.subscriptionStatus !== "Trial" || !vendor.trialEndAt) {
    return { status: vendor.subscriptionStatus, daysLeftInTrial: null, isTrialExpired: false };
  }
  const msLeft = vendor.trialEndAt.getTime() - Date.now();
  const daysLeftInTrial = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
  const isTrialExpired = msLeft <= 0;
  return { status: isTrialExpired ? "Trial Expired" : "Trial", daysLeftInTrial, isTrialExpired };
}
