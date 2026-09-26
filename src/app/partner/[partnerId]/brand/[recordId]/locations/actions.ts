"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createLocation, getBrand, getLocation, updateLocation, rupeesToPaise } from "@/lib/brandData";

function parseLocationValues(values: Record<string, unknown>) {
  const locationName = String(values["locationName"] ?? "").trim();
  const city = String(values["city"] ?? "").trim();
  if (!locationName) return { error: "Location Name is required." } as const;
  if (!city) return { error: "City is required." } as const;
  const openedDateStr = String(values["openedDate"] ?? "").trim();
  return {
    locationName,
    city,
    modulesEnabled: String(values["modulesEnabled"] ?? "").trim(),
    mappedWarehouseId: String(values["mappedWarehouseId"] ?? "").trim(),
    monthlyRevenue: rupeesToPaise(Number(values["monthlyRevenue"]) || 0),
    status: String(values["status"] ?? "Onboarding").trim() || "Onboarding",
    openedDate: openedDateStr ? new Date(openedDateStr) : null,
  } as const;
}

export async function createLocationAction(
  partnerId: string,
  brandId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const brand = await getBrand(partnerId, brandId);
  if (!brand) return { error: "Brand not found." };

  const parsed = parseLocationValues(values);
  if ("error" in parsed) return { error: parsed.error };

  const location = await createLocation(partnerId, brandId, parsed);
  revalidatePath(`/partner/${partnerId}/brand/${brandId}`);
  revalidatePath(`/partner/${partnerId}/brand/${brandId}/locations`);
  redirect(`/partner/${partnerId}/brand/${brandId}/locations/${location.id}`);
}

export async function updateLocationAction(
  partnerId: string,
  brandId: string,
  locationId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const existing = await getLocation(partnerId, brandId, locationId);
  if (!existing) return { error: "Location not found." };

  const parsed = parseLocationValues(values);
  if ("error" in parsed) return { error: parsed.error };

  await updateLocation(partnerId, brandId, locationId, parsed);
  revalidatePath(`/partner/${partnerId}/brand/${brandId}`);
  revalidatePath(`/partner/${partnerId}/brand/${brandId}/locations`);
  revalidatePath(`/partner/${partnerId}/brand/${brandId}/locations/${locationId}`);
  redirect(`/partner/${partnerId}/brand/${brandId}/locations/${locationId}?updated=1`);
}
