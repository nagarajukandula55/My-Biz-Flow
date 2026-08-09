"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createOffer, updateOffer, deleteOffer, type OfferInput } from "@/lib/subscriptionData";

function parseInput(formData: FormData): OfferInput {
  const validFrom = String(formData.get("validFrom") ?? "").trim();
  const validTo = String(formData.get("validTo") ?? "").trim();
  return {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    discountType: String(formData.get("discountType") ?? "percent"),
    discountValue: Number(formData.get("discountValue") ?? 0),
    planIds: formData.getAll("planIds").map(String).filter(Boolean),
    billingCycles: formData.getAll("billingCycles").map(String).filter(Boolean),
    isCombo: formData.get("isCombo") === "on",
    isActive: formData.get("isActive") === "on",
    validFrom: validFrom ? new Date(validFrom) : null,
    validTo: validTo ? new Date(validTo) : null,
  };
}

export async function createOfferAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Offer name is required");
  const offer = await createOffer(parseInput(formData));
  revalidatePath("/admin/offers");
  redirect(`/admin/offers/${offer.id}`);
}

export async function updateOfferAction(id: string, formData: FormData) {
  await updateOffer(id, parseInput(formData));
  revalidatePath("/admin/offers");
  revalidatePath(`/admin/offers/${id}`);
  redirect(`/admin/offers/${id}`);
}

export async function deleteOfferAction(id: string) {
  await deleteOffer(id);
  revalidatePath("/admin/offers");
}
