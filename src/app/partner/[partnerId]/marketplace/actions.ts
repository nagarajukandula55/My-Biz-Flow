"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import {
  createMarketplaceListing,
  getMarketplaceListing,
  rupeesToPaise,
  updateMarketplaceListing,
} from "@/lib/marketplace";

function parseValues(values: Record<string, unknown>) {
  const title = String(values["title"] ?? "").trim();
  if (!title) return { error: "Title is required." } as const;
  const price = rupeesToPaise(Number(values["price"]) || 0);
  if (price <= 0) return { error: "Enter a price greater than zero." } as const;
  const stockQuantity = Math.max(0, Math.round(Number(values["stockQuantity"]) || 0));
  return {
    title,
    description: String(values["description"] ?? "").trim(),
    category: String(values["category"] ?? "").trim(),
    price,
    stockQuantity,
    isActive: values["isActive"] === undefined ? true : Boolean(values["isActive"]),
  } as const;
}

export async function createMarketplaceListingAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const parsed = parseValues(values);
  if ("error" in parsed) return { error: parsed.error };

  const listing = await createMarketplaceListing(partnerId, parsed);
  revalidatePath(`/partner/${partnerId}/marketplace`);
  redirect(`/partner/${partnerId}/marketplace/${listing.id}`);
}

export async function updateMarketplaceListingAction(
  partnerId: string,
  recordId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const existing = await getMarketplaceListing(partnerId, recordId);
  if (!existing) return { error: "Listing not found." };

  const parsed = parseValues(values);
  if ("error" in parsed) return { error: parsed.error };

  await updateMarketplaceListing(partnerId, recordId, parsed);
  revalidatePath(`/partner/${partnerId}/marketplace`);
  revalidatePath(`/partner/${partnerId}/marketplace/${recordId}`);
  redirect(`/partner/${partnerId}/marketplace/${recordId}?updated=1`);
}
