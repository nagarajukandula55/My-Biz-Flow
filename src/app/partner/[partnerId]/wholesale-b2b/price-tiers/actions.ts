"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createPriceTier, getPriceTier, updatePriceTier } from "@/lib/wholesaleData";

function parseValues(values: Record<string, unknown>) {
  const name = String(values["name"] ?? "").trim();
  if (!name) return { error: "Name is required." } as const;
  const discountPercent = Number(values["discountPercent"]) || 0;
  if (discountPercent < 0 || discountPercent > 100) {
    return { error: "Discount % must be between 0 and 100." } as const;
  }
  return { name, discountPercent } as const;
}

export async function createPriceTierAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const parsed = parseValues(values);
  if ("error" in parsed) return { error: parsed.error };

  const tier = await createPriceTier(partnerId, parsed);
  revalidatePath(`/partner/${partnerId}/wholesale-b2b/price-tiers`);
  redirect(`/partner/${partnerId}/wholesale-b2b/price-tiers/${tier.id}`);
}

export async function updatePriceTierAction(
  partnerId: string,
  recordId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const existing = await getPriceTier(partnerId, recordId);
  if (!existing) return { error: "Price tier not found." };

  const parsed = parseValues(values);
  if ("error" in parsed) return { error: parsed.error };

  await updatePriceTier(partnerId, recordId, parsed);
  revalidatePath(`/partner/${partnerId}/wholesale-b2b/price-tiers`);
  revalidatePath(`/partner/${partnerId}/wholesale-b2b/price-tiers/${recordId}`);
  redirect(`/partner/${partnerId}/wholesale-b2b/price-tiers/${recordId}?updated=1`);
}
