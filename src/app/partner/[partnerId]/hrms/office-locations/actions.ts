"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createOfficeLocation, updateOfficeLocation, validCoordinates } from "@/lib/hrms";

export async function createOfficeLocationAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const name = String(values["name"] ?? "").trim();
  if (!name) return { error: "Name is required." };
  const lat = Number(values["lat"]);
  const lng = Number(values["lng"]);
  if (String(values["lat"] ?? "").trim() === "" || String(values["lng"] ?? "").trim() === "" || !validCoordinates(lat, lng)) return { error: "Enter valid latitude (-90 to 90) and longitude (-180 to 180)." };
  const geofenceRadiusMeters = values["geofenceRadiusMeters"] == null || values["geofenceRadiusMeters"] === "" ? undefined : Number(values["geofenceRadiusMeters"]);
  if (geofenceRadiusMeters !== undefined && (!Number.isSafeInteger(geofenceRadiusMeters) || geofenceRadiusMeters < 1 || geofenceRadiusMeters > 100000)) return { error: "Enter a whole radius between 1 and 100000 metres." };
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
  if (String(values["lat"] ?? "").trim() === "" || String(values["lng"] ?? "").trim() === "" || !validCoordinates(lat, lng)) return { error: "Enter valid latitude (-90 to 90) and longitude (-180 to 180)." };
  const geofenceRadiusMeters = values["geofenceRadiusMeters"] == null || values["geofenceRadiusMeters"] === "" ? undefined : Number(values["geofenceRadiusMeters"]);
  if (geofenceRadiusMeters !== undefined && (!Number.isSafeInteger(geofenceRadiusMeters) || geofenceRadiusMeters < 1 || geofenceRadiusMeters > 100000)) return { error: "Enter a whole radius between 1 and 100000 metres." };
  await updateOfficeLocation(partnerId, id, { name, lat, lng, geofenceRadiusMeters });
  revalidatePath(`/partner/${partnerId}/hrms/office-locations`);
  redirect(`/partner/${partnerId}/hrms/office-locations`);
}
