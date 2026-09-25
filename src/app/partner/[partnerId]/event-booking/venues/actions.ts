"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createVenue, updateVenue } from "@/lib/eventBooking";

export async function createVenueAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const name = String(values["name"] ?? "").trim();
  if (!name) return { error: "Name is required." };
  const address = values["address"] ? String(values["address"]) : undefined;
  const capacity = values["capacity"] ? Number(values["capacity"]) : undefined;
  await createVenue(partnerId, { name, address, capacity });
  revalidatePath(`/partner/${partnerId}/event-booking/venues`);
  redirect(`/partner/${partnerId}/event-booking/venues`);
}

export async function updateVenueAction(
  partnerId: string,
  venueId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const name = String(values["name"] ?? "").trim();
  if (!name) return { error: "Name is required." };
  const address = values["address"] ? String(values["address"]) : undefined;
  const capacity = values["capacity"] ? Number(values["capacity"]) : undefined;
  const isActive = Boolean(values["isActive"]);
  await updateVenue(partnerId, venueId, { name, address, capacity, isActive });
  revalidatePath(`/partner/${partnerId}/event-booking/venues`);
  redirect(`/partner/${partnerId}/event-booking/venues`);
}
