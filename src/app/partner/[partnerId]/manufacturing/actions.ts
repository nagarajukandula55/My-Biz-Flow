"use server";

import { revalidatePath } from "next/cache";
import { createBusinessRecord, getBusinessRecord, listBusinessRecords, updateBusinessRecord } from "@/lib/businessRecords";
import { extractProductionFromRecord } from "@/lib/sample-data/manufacturing";

/**
 * Completes production: recomputes cost server-side (never trusts client
 * math), checks + deducts raw-material stock for every BOM line against
 * "inventory-stock" (fail closed — no partial deduction, same read-check-
 * then-write pattern as completeSaleAction in
 * pos/checkout/actions.ts), then optionally adds the finished good as a
 * new "inventory-stock" item. Read-then-write against BusinessRecord's
 * JSON blob (not a DB-level atomic decrement) — same documented
 * limitation as POS/Service Centre until per-SKU stock becomes a real
 * relational column.
 *
 * Returns { error } instead of throwing so the client component can show
 * a clear inline message (mirrors the "fail closed" UX, not just a crash).
 */
export async function completeProductionAction(
  partnerId: string,
  workOrderId: string,
  laborCost: number,
  quantityProduced: number
): Promise<{ error?: string }> {
  const record = await getBusinessRecord(partnerId, "manufacturing", workOrderId);
  if (!record) return { error: "Work order not found." };

  const production = extractProductionFromRecord(record);
  if (production.stage !== "QC") {
    return { error: "Production must reach the QC stage before it can be completed." };
  }
  if (production.bomLines.length === 0) {
    return { error: "Add at least one BOM line before completing production." };
  }
  const safeLaborCost = Number.isFinite(laborCost) && laborCost >= 0 ? laborCost : 0;
  const safeQuantityProduced = Number.isFinite(quantityProduced) && quantityProduced >= 0 ? quantityProduced : 0;

  // Raw-material stock check — fail closed, no partial deduction.
  const stockRecords = await listBusinessRecords(partnerId, "inventory-stock");
  const stockById = new Map(stockRecords.map((r) => [String(r["id"]), r]));
  for (const line of production.bomLines) {
    const stock = stockById.get(line.materialId);
    const available = Number(stock?.["quantityOnHand"] ?? 0);
    if (!stock || available < line.qty) {
      return {
        error: `Insufficient stock for ${line.materialLabel}: ${available} available, ${line.qty} required.`,
      };
    }
  }
  for (const line of production.bomLines) {
    const stock = stockById.get(line.materialId)!;
    const newQty = Number(stock["quantityOnHand"] ?? 0) - line.qty;
    await updateBusinessRecord(partnerId, "inventory-stock", line.materialId, { ...stock, quantityOnHand: newQty });
  }

  const materialCost = production.bomLines.reduce((sum, l) => sum + l.qty * l.rate, 0);
  const totalCost = materialCost + safeLaborCost;

  let finishedGoodStockId: string | undefined;
  if (safeQuantityProduced > 0) {
    const productName = String(record["productName"] ?? workOrderId);
    const finishedGood = await createBusinessRecord(partnerId, "inventory-stock", {
      itemName: `${productName} (Finished Good — ${workOrderId})`,
      quantityOnHand: safeQuantityProduced,
      unitCost: Math.round((totalCost / safeQuantityProduced) * 100) / 100,
      reorderLevel: 0,
      stockStatus: "In stock",
      sourceProductionWorkOrderId: workOrderId,
    });
    finishedGoodStockId = String(finishedGood.id);
  }

  await updateBusinessRecord(partnerId, "manufacturing", workOrderId, {
    ...record,
    stage: "Completed",
    status: "Completed",
    quantityProduced: safeQuantityProduced,
    laborCost: safeLaborCost,
    materialCost,
    totalCost,
    finishedGoodStockId,
    completedAt: new Date().toISOString(),
  });

  revalidatePath(`/partner/${partnerId}/manufacturing`);
  revalidatePath(`/partner/${partnerId}/manufacturing/${workOrderId}`);
  revalidatePath(`/partner/${partnerId}/inventory`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  return {};
}
