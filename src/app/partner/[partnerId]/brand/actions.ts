"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createBrand, getBrand, updateBrand } from "@/lib/brandData";

function parseBrandValues(values: Record<string, unknown>) {
  const name = String(values["name"] ?? "").trim();
  if (!name) return { error: "Brand Name is required." } as const;
  return {
    name,
    isActive: values["isActive"] === undefined ? true : Boolean(values["isActive"]),
  } as const;
}

export async function createBrandAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const parsed = parseBrandValues(values);
  if ("error" in parsed) return { error: parsed.error };

  const brand = await createBrand(partnerId, parsed);
  revalidatePath(`/partner/${partnerId}/brand`);
  redirect(`/partner/${partnerId}/brand/${brand.id}`);
}

export async function updateBrandAction(
  partnerId: string,
  recordId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const existing = await getBrand(partnerId, recordId);
  if (!existing) return { error: "Brand not found." };

  const parsed = parseBrandValues(values);
  if ("error" in parsed) return { error: parsed.error };

  await updateBrand(partnerId, recordId, parsed);
  revalidatePath(`/partner/${partnerId}/brand`);
  revalidatePath(`/partner/${partnerId}/brand/${recordId}`);
  redirect(`/partner/${partnerId}/brand/${recordId}?updated=1`);
}
