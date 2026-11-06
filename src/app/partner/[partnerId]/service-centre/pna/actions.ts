"use server";

import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { getBusinessRecord, updateBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { createPartOrderAction } from "@/app/partner/[partnerId]/inventory/part-orders/actions";

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

/**
 * Raises one real Part Order per selected PNA row — the actual "go source
 * these parts" action, not just a tracking list. Reuses
 * createPartOrderAction (src/app/partner/[partnerId]/inventory/part-orders/actions.ts)
 * as-is, status "Pending" (an order just raised hasn't left the source
 * warehouse yet, so it doesn't touch real Stock — same rule Part Orders
 * always follows). Each PNA row that got an order moves to "Ordered" so
 * it's distinguishable from one nobody's actioned yet; a row that already
 * failed validation (e.g. the material genuinely isn't in this warehouse's
 * catalog) is skipped, not silently dropped — its error is collected and
 * returned so the caller can show exactly which ones didn't go through.
 */
export async function raisePartOrdersFromPnaAction(
  partnerId: string,
  payload: { pnaIds: string[]; sourceWarehouseName: string; destinationLocation: string }
): Promise<{ createdCount: number; errors: string[] }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const sourceWarehouseName = payload.sourceWarehouseName.trim();
  const destinationLocation = payload.destinationLocation.trim() || "Service Centre";
  if (!sourceWarehouseName) return { createdCount: 0, errors: ["Choose a source warehouse."] };

  const rows = await listBusinessRecords(partnerId, "service-centre-pna");
  const selected = rows.filter((r) => payload.pnaIds.includes(String(r["id"])) && r["status"] === "Open");

  let createdCount = 0;
  const errors: string[] = [];
  for (const row of selected) {
    const materialLabel = String(row["materialLabel"] ?? row["materialId"] ?? "");
    const result = await createPartOrderAction(partnerId, {
      materialId: materialLabel,
      quantity: Number(row["qty"] ?? 1),
      sourceWarehouseName,
      destinationLocation,
      status: "Pending",
    });
    if (result && "error" in result && result.error) {
      errors.push(`${materialLabel}: ${result.error}`);
      continue;
    }
    await updateBusinessRecord(partnerId, "service-centre-pna", String(row["id"]), { ...row, status: "Ordered" });
    createdCount++;
  }

  if (createdCount > 0) {
    revalidatePath(`/partner/${partnerId}/service-centre/pna`);
    revalidatePath(`/partner/${partnerId}/inventory/part-orders`);
  }
  return { createdCount, errors };
}
