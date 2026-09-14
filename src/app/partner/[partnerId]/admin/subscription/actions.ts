"use server";

import { revalidatePath } from "next/cache";
import { getPartner, updatePartnerSubscription } from "@/lib/partnerData";
import { BILLING_CYCLES, type BillingCycle } from "@/lib/subscriptionData";

/**
 * Partner picks a Plan + billing cycle to convert off trial. There's no
 * payment gateway wired up (see CLAUDE.md's integration constraints), so
 * this records the choice and moves the partner to "PastDue" — payment
 * pending offline confirmation — rather than pretending a real charge
 * happened. A Super Admin flips it to "Active" once paid, from
 * /admin/subscribers/[partnerId]/edit.
 */
export async function chooseSubscriptionAction(partnerId: string, formData: FormData) {
  const planId = String(formData.get("planId") ?? "").trim();
  const billingCycle = String(formData.get("billingCycle") ?? "").trim() as BillingCycle;
  if (!planId || !billingCycle) throw new Error("Choose a plan and a billing cycle");
  // Reject anything but Yearly/TwoYearly server-side too -- the UI only
  // renders BILLING_CYCLES as radio options, but a raw POST could still try
  // to smuggle in a removed cycle (e.g. "Monthly") without this check.
  if (!BILLING_CYCLES.includes(billingCycle)) throw new Error("Invalid billing cycle");

  const partner = await getPartner(partnerId);
  if (!partner) throw new Error("Partner not found");

  await updatePartnerSubscription(partnerId, {
    subscriptionStatus: "PastDue",
    trialStartAt: partner.trialStartAt,
    trialEndAt: partner.trialEndAt,
    billingCycle,
    planId,
    offerId: partner.offerId,
  });

  revalidatePath(`/partner/${partnerId}/admin/subscription`);
  revalidatePath("/admin/subscribers");
}
