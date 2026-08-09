"use server";

import { revalidatePath } from "next/cache";
import { getVendor, updateVendorSubscription } from "@/lib/vendorData";
import type { BillingCycle } from "@/lib/subscriptionData";

/**
 * Vendor picks a Plan + billing cycle to convert off trial. There's no
 * payment gateway wired up (see CLAUDE.md's integration constraints), so
 * this records the choice and moves the vendor to "PastDue" — payment
 * pending offline confirmation — rather than pretending a real charge
 * happened. A Super Admin flips it to "Active" once paid, from
 * /admin/subscribers/[vendorId]/edit.
 */
export async function chooseSubscriptionAction(vendorId: string, formData: FormData) {
  const planId = String(formData.get("planId") ?? "").trim();
  const billingCycle = String(formData.get("billingCycle") ?? "").trim() as BillingCycle;
  if (!planId || !billingCycle) throw new Error("Choose a plan and a billing cycle");

  const vendor = await getVendor(vendorId);
  if (!vendor) throw new Error("Vendor not found");

  await updateVendorSubscription(vendorId, {
    subscriptionStatus: "PastDue",
    trialStartAt: vendor.trialStartAt,
    trialEndAt: vendor.trialEndAt,
    billingCycle,
    planId,
    offerId: vendor.offerId,
  });

  revalidatePath(`/vendor/${vendorId}/admin/subscription`);
  revalidatePath("/admin/subscribers");
}
