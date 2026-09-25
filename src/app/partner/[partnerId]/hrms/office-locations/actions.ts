"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createOfficeLocation, updateOfficeLocation } from "@/lib/hrms";

export async function createOfficeLocationAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const name = String(values["name"] ?? "").trim();
  if (!name) return { error: "Name is required." };
  const lat = Number(values["lat"]);
  const lng = Number(values["lng"]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return { error: "Latitude and longitude are required." };
  const geofenceRadiusMeters = values["geofenceRadiusMeters"] ? Number(values["geofenceRadiusMeters"]) : undefined;
  await createOfficeLocation(partnerId, { name, lat, lng, geofenceRadiusMeters });
  revalidatePath(`/partner/${partnerId}/hrms/office-locations`);
  redirect(`/partner/${partnerId}/hrms/office-locations`);
}

export async function updateOfficeLocationAction(
  partnerId: string,
  id: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const name = String(values["name"] ?? "").trim();
  if (!name) return { error: "Name is required." };
  const lat = Number(values["lat"]);
  const lng = Number(values["lng"]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return { error: "Latitude and longitude are required." };
  const geofenceRadiusMeters = values["geofenceRadiusMeters"] ? Number(values["geofenceRadiusMeters"]) : undefined;
  await updateOfficeLocation(partnerId, id, { name, lat, lng, geofenceRadiusMeters });
  revalidatePath(`/partner/${partnerId}/hrms/office-locations`);
  redirect(`/partner/${partnerId}/hrms/office-locations`);
}
