"use server";

import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { checkIn, checkOut } from "@/lib/hrms";

export async function checkInAction(
  partnerId: string,
  employeeId: string,
  lat: number,
  lng: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const result = await checkIn(partnerId, employeeId, lat, lng);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath(`/partner/${partnerId}/hrms/attendance`);
  return { ok: true };
}

export async function checkOutAction(
  partnerId: string,
  employeeId: string,
  lat: number,
  lng: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const result = await checkOut(partnerId, employeeId, lat, lng);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath(`/partner/${partnerId}/hrms/attendance`);
  return { ok: true };
}
