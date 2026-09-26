"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createDriver, updateDriver } from "@/lib/logisticsFleet";

export async function createDriverAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const name = String(values["name"] ?? "").trim();
  if (!name) return { error: "Driver name is required." };
  const driver = await createDriver(partnerId, {
    name,
    phone: values["phone"] ? String(values["phone"]) : undefined,
    isActive: values["isActive"] === undefined ? true : Boolean(values["isActive"]),
  });
  revalidatePath(`/partner/${partnerId}/logistics-fleet/drivers`);
  redirect(`/partner/${partnerId}/logistics-fleet/drivers/${driver.id}`);
}

export async function updateDriverAction(
  partnerId: string,
  driverId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const name = String(values["name"] ?? "").trim();
  if (!name) return { error: "Driver name is required." };
  await updateDriver(partnerId, driverId, {
    name,
    phone: values["phone"] ? String(values["phone"]) : undefined,
    isActive: Boolean(values["isActive"]),
  });
  revalidatePath(`/partner/${partnerId}/logistics-fleet/drivers`);
  revalidatePath(`/partner/${partnerId}/logistics-fleet/drivers/${driverId}`);
  redirect(`/partner/${partnerId}/logistics-fleet/drivers/${driverId}`);
}
