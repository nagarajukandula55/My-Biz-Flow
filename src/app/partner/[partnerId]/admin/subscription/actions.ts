"use server";

import { revalidatePath } from "next/cache";
import { getPartner, updatePartnerSubscription } from "@/lib/partnerData";
import { BILLING_CYCLES, type BillingCycle } from "@/lib/subscriptionData";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";

/**
 * Partner picks a Plan + billing cycle to convert off trial (or to switch
 * plan/cycle while still awaiting payment — see below). Moves to "PastDue"
 * ("payment chosen, not yet paid") so a real Razorpay charge
 * (RazorpayCheckoutButton -> /api/razorpay/create-order+verify) can
 * immediately follow on this same page; verify/route.ts flips this to
 * "Active" itself once the payment is confirmed — no manual Super Admin
 * step needed for the normal path. A Super Admin can still hand-activate
 * from /admin/subscribers/[partnerId]/edit as a fallback (e.g. an offline
 * payment), which is the only case this status is genuinely "awaiting a
 * human" rather than "awaiting Razorpay's own callback."
 *
 * Re-callable from PastDue, not just Trial: if a partner opened Razorpay
 * checkout and closed it without paying, they'd otherwise be stuck seeing
 * only a "Pay ₹X" button for their original choice with no way to pick a
 * different plan/cycle before trying again — this action being safe to
 * call again (just overwrites planId/billingCycle, stays PastDue) is what
 * lets the page offer a "Change plan" option in that state instead.
 */
export async function chooseSubscriptionAction(partnerId: string, formData: FormData) {
  await requireSessionPartnerId(partnerId);
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
