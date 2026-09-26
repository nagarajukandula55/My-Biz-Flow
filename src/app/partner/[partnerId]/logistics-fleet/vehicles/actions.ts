"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createVehicle, updateVehicle } from "@/lib/logisticsFleet";

export async function createVehicleAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const vehicleNumber = String(values["vehicleNumber"] ?? "").trim();
  if (!vehicleNumber) return { error: "Vehicle number is required." };
  const vehicle = await createVehicle(partnerId, {
    vehicleNumber,
    isActive: values["isActive"] === undefined ? true : Boolean(values["isActive"]),
  });
  revalidatePath(`/partner/${partnerId}/logistics-fleet/vehicles`);
  redirect(`/partner/${partnerId}/logistics-fleet/vehicles/${vehicle.id}`);
}

export async function updateVehicleAction(
  partnerId: string,
  vehicleId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const vehicleNumber = String(values["vehicleNumber"] ?? "").trim();
  if (!vehicleNumber) return { error: "Vehicle number is required." };
  await updateVehicle(partnerId, vehicleId, {
    vehicleNumber,
    isActive: Boolean(values["isActive"]),
  });
  revalidatePath(`/partner/${partnerId}/logistics-fleet/vehicles`);
  revalidatePath(`/partner/${partnerId}/logistics-fleet/vehicles/${vehicleId}`);
  redirect(`/partner/${partnerId}/logistics-fleet/vehicles/${vehicleId}`);
}
