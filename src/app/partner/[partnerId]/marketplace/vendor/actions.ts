"use server";

import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { setMarketplaceVendorActive } from "@/lib/marketplace";

/** Same single-settings-row-per-partner pattern as Inventory's
 * ageing-threshold (src/app/partner/[partnerId]/inventory/ageing/actions.ts),
 * except this one is backed by a real migrated MarketplaceVendor row rather
 * than a BusinessRecord, since that table already exists. */
export async function setMarketplaceVendorActiveAction(partnerId: string, formData: FormData): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  const isActive = formData.get("isActive") === "on";
  await setMarketplaceVendorActive(partnerId, isActive);
  revalidatePath(`/partner/${partnerId}/marketplace/vendor`);
}
