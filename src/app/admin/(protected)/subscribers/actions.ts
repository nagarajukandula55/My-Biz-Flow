"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updateVendorSubscription } from "@/lib/vendorData";

export async function updateVendorSubscriptionAction(vendorId: string, formData: FormData) {
  const trialStartAt = String(formData.get("trialStartAt") ?? "").trim();
  const trialEndAt = String(formData.get("trialEndAt") ?? "").trim();
  const billingCycle = String(formData.get("billingCycle") ?? "").trim();
  const planId = String(formData.get("planId") ?? "").trim();
  const offerId = String(formData.get("offerId") ?? "").trim();

  await updateVendorSubscription(vendorId, {
    subscriptionStatus: String(formData.get("subscriptionStatus") ?? "Trial"),
    trialStartAt: trialStartAt ? new Date(trialStartAt) : null,
    trialEndAt: trialEndAt ? new Date(trialEndAt) : null,
    billingCycle: billingCycle || null,
    planId: planId || null,
    offerId: offerId || null,
  });

  revalidatePath("/admin/subscribers");
  revalidatePath(`/admin/subscribers/${vendorId}/edit`);
  revalidatePath(`/vendor/${vendorId}/admin/subscription`);
  redirect(`/admin/subscribers/${vendorId}/edit`);
}
