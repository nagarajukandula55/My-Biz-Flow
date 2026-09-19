"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createBusinessRecord } from "@/lib/businessRecords";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { runBulkImport, type BulkImportResult } from "@/lib/bulkImportCsv";
import { getStockTakeFormFields } from "@/lib/sample-data/warehouse";
import { getBomOptionsForPartner } from "@/lib/sample-data/bom";
import { setStockQty, parseSerialNumbers, validateSerialNumbers } from "@/lib/inventoryStock";

/**
 * Same shape as createBusinessRecordAction (bind with .bind(null, partnerId)
 * before passing as a RecordForm `action` prop), but stores the computed
 * variance (countedQty - expectedQty) alongside the entered values —
 * variance is read-only/derived, never typed by the counter. When the
 * count is entered as already Reconciled, this also sets the real Stock
 * quantity to the counted figure (a physical count corrects the system's
 * number, not the other way round) — a Pending stock take doesn't touch
 * live stock until it's reconciled. A serialized material also needs its
 * counted serials captured at that same Reconciled moment; a non-serialized
 * material never asks for them.
 */
export async function createStockTakeAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  await requireSessionPartnerId(partnerId);
  const expectedQty = Number(values["expectedQty"] ?? 0);
  const countedQty = Number(values["countedQty"] ?? 0);
  const materialId = String(values["materialId"] ?? "").trim();
  const warehouseName = String(values["warehouseName"] ?? "").trim();
  const isReconciled = values["status"] === "Reconciled";

  let isSerialized = false;
  let serialNumbers: string[] = [];
  if (isReconciled && materialId) {
    const bomOptions = await getBomOptionsForPartner(partnerId);
    isSerialized = bomOptions.some((o) => o.label === materialId && o.serialized);
    serialNumbers = parseSerialNumbers(values["serialNumbers"]);
    if (isSerialized) {
      const error = validateSerialNumbers(serialNumbers, countedQty, materialId);
      if (error) return { error };
    }
  }

  const record = await createBusinessRecord(partnerId, "inventory-stock-take", {
    ...values,
    variance: countedQty - expectedQty,
    serialNumbers: isSerialized ? serialNumbers : [],
  });
  if (isReconciled && materialId && warehouseName) {
    await setStockQty(partnerId, materialId, materialId, warehouseName, countedQty);
  }
  revalidatePath(`/partner/${partnerId}/inventory/stock-take`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  redirect(`/partner/${partnerId}/inventory/stock-take?created=1#${record.id}`);
}

export async function bulkImportStockTakeAction(partnerId: string, formData: FormData): Promise<BulkImportResult> {
  partnerId = await requireSessionPartnerId(partnerId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a CSV file to upload");

  const bomOptions = await getBomOptionsForPartner(partnerId);
  const fields = await getStockTakeFormFields(partnerId);
  const result = await runBulkImport(partnerId, "inventory-stock-take", file, fields, async (values) => {
    const materialId = String(values["materialId"] ?? "").trim();
    const warehouseName = String(values["warehouseName"] ?? "").trim();
    const countedQty = Number(values["countedQty"] ?? 0);
    const isReconciled = values["status"] === "Reconciled";

    let isSerialized = false;
    let serialNumbers: string[] = [];
    if (isReconciled && materialId) {
      isSerialized = bomOptions.some((o) => o.label === materialId && o.serialized);
      serialNumbers = parseSerialNumbers(values["serialNumbers"]);
      if (isSerialized) {
        const error = validateSerialNumbers(serialNumbers, countedQty, materialId);
        if (error) throw new Error(`Row for "${materialId}": ${error}`);
      }
    }

    if (isReconciled && materialId && warehouseName) {
      await setStockQty(partnerId, materialId, materialId, warehouseName, countedQty);
    }
    return {
      ...values,
      variance: countedQty - Number(values["expectedQty"] ?? 0),
      serialNumbers: isSerialized ? serialNumbers : [],
    };
  });
  revalidatePath(`/partner/${partnerId}/inventory/stock-take`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  return result;
}
