"use server";

import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { getBusinessRecord, createBusinessRecord, updateBusinessRecord } from "@/lib/businessRecords";

/**
 * Sets the partner's forecast window (in days) for Part Planning — a
 * single BusinessRecord row (moduleSlug "inventory-settings", fixed key
 * "forecast-window") rather than a new Prisma table, same generic-store
 * pattern every other Inventory quantity already uses. Read back by
 * getForecastWindowDays (src/lib/inventoryForecast.ts).
 */
export async function setForecastWindowAction(partnerId: string, formData: FormData): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);

  const windowDays = Math.round(Number(formData.get("windowDays")));
  if (!Number.isFinite(windowDays) || windowDays <= 0) {
    return;
  }

  const existing = await getBusinessRecord(partnerId, "inventory-settings", "forecast-window");
  if (existing) {
    await updateBusinessRecord(partnerId, "inventory-settings", "forecast-window", { windowDays });
  } else {
    await createBusinessRecord(partnerId, "inventory-settings", { id: "forecast-window", windowDays });
  }

  revalidatePath(`/partner/${partnerId}/inventory/part-planning`);
}
