"use server";

import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { getBusinessRecord, createBusinessRecord, updateBusinessRecord } from "@/lib/businessRecords";

/**
 * Partner-configurable ageing threshold (in days) — same single-
 * BusinessRecord-row pattern as Part Planning's forecast window
 * (moduleSlug "inventory-settings", fixed key "ageing-threshold"), rather
 * than a new Prisma table.
 */
export async function setAgeingThresholdAction(partnerId: string, formData: FormData): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);

  const thresholdDays = Math.round(Number(formData.get("thresholdDays")));
  if (!Number.isFinite(thresholdDays) || thresholdDays <= 0) return;

  const existing = await getBusinessRecord(partnerId, "inventory-settings", "ageing-threshold");
  if (existing) {
    await updateBusinessRecord(partnerId, "inventory-settings", "ageing-threshold", { thresholdDays });
  } else {
    await createBusinessRecord(partnerId, "inventory-settings", { id: "ageing-threshold", thresholdDays });
  }

  revalidatePath(`/partner/${partnerId}/inventory/ageing`);
}
