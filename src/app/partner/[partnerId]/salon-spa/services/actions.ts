"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createSalonService, updateSalonService } from "@/lib/salonSpa/servicesData";

export async function createSalonServiceAction(partnerId: string, values: Record<string, unknown>): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  const service = await createSalonService(partnerId, {
    name: String(values["name"] ?? ""),
    durationMinutes: Number(values["durationMinutes"]) || 30,
    price: Number(values["price"]) || 0,
  });
  revalidatePath(`/partner/${partnerId}/salon-spa/services`);
  redirect(`/partner/${partnerId}/salon-spa/services/${service.id}`);
}

export async function updateSalonServiceAction(partnerId: string, recordId: string, values: Record<string, unknown>): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  await updateSalonService(partnerId, recordId, {
    name: String(values["name"] ?? ""),
    durationMinutes: Number(values["durationMinutes"]) || 30,
    price: Number(values["price"]) || 0,
    isActive: Boolean(values["isActive"]),
  });
  revalidatePath(`/partner/${partnerId}/salon-spa/services`);
  revalidatePath(`/partner/${partnerId}/salon-spa/services/${recordId}`);
  redirect(`/partner/${partnerId}/salon-spa/services/${recordId}`);
}
