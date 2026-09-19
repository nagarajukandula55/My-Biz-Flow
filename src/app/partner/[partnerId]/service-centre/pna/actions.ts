"use server";

import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { getBusinessRecord, updateBusinessRecord } from "@/lib/businessRecords";

/**
 * Marks a PNA entry Fulfilled once owner/staff have actually sourced the
 * part (via a Part Order/Stock Adjustment raised from Inventory) — this
 * only updates the tracking record itself, it does not touch real Stock
 * (that already happened through whichever Inventory document brought the
 * part in; see PnaClientTable's live "Available now" indicator, computed
 * from the real Stock ledger, which is what actually tells staff the part
 * showed up).
 */
export async function resolvePnaEntryAction(partnerId: string, recordId: string): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  const existing = await getBusinessRecord(partnerId, "service-centre-pna", recordId);
  if (!existing) return;
  await updateBusinessRecord(partnerId, "service-centre-pna", recordId, { ...existing, status: "Fulfilled" });
  revalidatePath(`/partner/${partnerId}/service-centre/pna`);
}
