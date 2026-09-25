"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createEventResource, updateEventResource } from "@/lib/eventBooking";

export async function createEventResourceAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const name = String(values["name"] ?? "").trim();
  if (!name) return { error: "Name is required." };
  const category = values["category"] ? String(values["category"]) : undefined;
  await createEventResource(partnerId, { name, category });
  revalidatePath(`/partner/${partnerId}/event-booking/resources`);
  redirect(`/partner/${partnerId}/event-booking/resources`);
}

export async function updateEventResourceAction(
  partnerId: string,
  resourceId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const name = String(values["name"] ?? "").trim();
  if (!name) return { error: "Name is required." };
  const category = values["category"] ? String(values["category"]) : undefined;
  const isActive = Boolean(values["isActive"]);
  await updateEventResource(partnerId, resourceId, { name, category, isActive });
  revalidatePath(`/partner/${partnerId}/event-booking/resources`);
  redirect(`/partner/${partnerId}/event-booking/resources`);
}
