"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createBusinessRecord, getBusinessRecord, updateBusinessRecord } from "@/lib/businessRecords";
import { runBulkImport, type BulkImportResult } from "@/lib/bulkImportCsv";
import { getStockAdjustmentFormFields } from "@/lib/sample-data/warehouse";
import { getBomOptionsForPartner } from "@/lib/sample-data/bom";
import { adjustStockQty, getQtyOnHand, parseSerialNumbers, validateSerialNumbers } from "@/lib/inventoryStock";

/**
 * Creates a Stock Adjustment record AND actually applies it to the real
 * Stock quantity — an Increase adds, a Decrease subtracts (fail-closed: a
 * Decrease larger than what's on hand is rejected rather than going
 * negative). This is the one place a Stock quantity should change by
 * manual entry — Stock's own edit page no longer exposes Qty on Hand as
 * an editable field, precisely so every quantity change has a reason and
 * a paper trail here (or via Part Orders / Stock Take) instead of a bare
 * number overwrite with no record of why.
 *
 * Deliberately Good-stock-only, no condition field, no way to touch a
 * Defective bucket from here — a partner cannot manually add/remove/write
 * off Defective stock by any path. The ONLY way Defective stock ever
 * decreases is an Outbound Return Order with a Challan Number (see
 * inventory/return-orders/actions.ts), which is itself auditable and
 * requires the shipping paperwork to exist before stock moves.
 */
async function createStockAdjustmentCore(
  partnerId: string,
  values: Record<string, unknown>
): Promise<{ error?: string; record?: Record<string, unknown> }> {
  const materialId = String(values["materialId"] ?? "").trim();
  const warehouseName = String(values["warehouseName"] ?? "").trim();
  const adjustmentType = String(values["adjustmentType"] ?? "");
  const quantity = Number(values["quantity"] ?? 0);

  if (!materialId || !warehouseName || !Number.isFinite(quantity) || quantity <= 0) {
    return { error: "Material, Warehouse and a positive Quantity are required." };
  }

  const delta = adjustmentType === "Decrease" ? -quantity : quantity;
  if (delta < 0) {
    const available = await getQtyOnHand(partnerId, materialId, warehouseName);
    if (available < quantity) {
      return { error: `Cannot decrease by ${quantity} — only ${available} on hand for this material at this warehouse.` };
    }
  }

  // A serialized material (BOM's own "Serialized" flag) needs one barcode/
  // serial collected per unit, not just a bare quantity — a non-serialized
  // material goes through on quantity alone, nothing else asked.
  const bomOptions = await getBomOptionsForPartner(partnerId);
  const isSerialized = bomOptions.some((o) => o.label === materialId && o.serialized);
  const serialNumbers = parseSerialNumbers(values["serialNumbers"]);
  if (isSerialized) {
    const error = validateSerialNumbers(serialNumbers, quantity, materialId);
    if (error) return { error };
  }

  const record = await createBusinessRecord(partnerId, "inventory-stock-adjustments", {
    ...values,
    serialNumbers: isSerialized ? serialNumbers : [],
  });
  await adjustStockQty(partnerId, materialId, materialId, warehouseName, delta);
  return { record };
}

/**
 * Creates a Stock Adjustment record AND actually applies it to the real
 * Stock quantity — an Increase adds, a Decrease subtracts (fail-closed: a
 * Decrease larger than what's on hand is rejected rather than going
 * negative). This is the one place a Stock quantity should change by
 * manual entry — Stock's own edit page no longer exposes Qty on Hand as
 * an editable field, precisely so every quantity change has a reason and
 * a paper trail here (or via Part Orders / Stock Take) instead of a bare
 * number overwrite with no record of why.
 *
 * Deliberately Good-stock-only, no condition field, no way to touch a
 * Defective bucket from here — a partner cannot manually add/remove/write
 * off Defective stock by any path. The ONLY way Defective stock ever
 * decreases is an Outbound Return Order with a Challan Number (see
 * inventory/return-orders/actions.ts), which is itself auditable and
 * requires the shipping paperwork to exist before stock moves.
 */
export async function createStockAdjustmentAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);

  const { error } = await createStockAdjustmentCore(partnerId, values);
  if (error) return { error };

  revalidatePath(`/partner/${partnerId}/inventory/stock-adjustments`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
}

/**
 * Multi-line-item create — one shared set of header fields (Warehouse,
 * Type, Reason, Adjusted By, Date) plus a row per material (Material,
 * Quantity, Serial/Barcode Numbers), the same "add row" interaction
 * pattern Billing's invoice form already uses (see LineItemsEditor.tsx),
 * adapted since a Stock Adjustment line isn't priced, just
 * material+qty+serials. Each line becomes its own
 * "inventory-stock-adjustments" BusinessRecord and its own real Stock
 * delta — no new field names, existing detail/edit pages keep working
 * unmodified. Lines are applied in order; the first line that fails stops
 * the loop (earlier lines already created/applied in this submission stay
 * that way, same as if they'd been entered one at a time) and the error
 * names which line/material failed.
 */
export async function createStockAdjustmentsMultiAction(
  partnerId: string,
  common: Record<string, unknown>,
  lines: Array<Record<string, unknown>>
): Promise<{ error?: string; createdIds?: string[] }> {
  partnerId = await requireSessionPartnerId(partnerId);

  if (!Array.isArray(lines) || lines.length === 0) {
    return { error: "Add at least one line item." };
  }

  const createdIds: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const values = { ...common, ...lines[i] };
    const { error, record } = await createStockAdjustmentCore(partnerId, values);
    if (error) {
      const label = String(lines[i]["materialId"] ?? `#${i + 1}`);
      return {
        error: `Line ${i + 1} (${label}): ${error}${createdIds.length > 0 ? ` — ${createdIds.length} earlier line(s) were already created and applied.` : ""}`,
        createdIds,
      };
    }
    createdIds.push(String(record!["id"]));
  }

  revalidatePath(`/partner/${partnerId}/inventory/stock-adjustments`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  redirect(`/partner/${partnerId}/inventory/stock-adjustments?created=${createdIds.length}`);
}

/**
 * Edits an existing Stock Adjustment. Unlike Return Orders (which stay
 * Pending until a status change applies their stock effect), a Stock
 * Adjustment's real Stock delta is applied immediately at creation, so
 * editing one after the fact must first REVERSE the original delta (using
 * the record's own stored materialId/warehouseName/adjustmentType/quantity,
 * not whatever the form now says) before validating and applying the new
 * one — otherwise the old and new deltas would both land and silently
 * double-count. Only the NEW delta, if it's itself a Decrease, is checked
 * against what's on hand (after the reversal has already put stock back).
 */
export async function updateStockAdjustmentAction(
  partnerId: string,
  recordId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);

  const existing = await getBusinessRecord(partnerId, "inventory-stock-adjustments", recordId);
  if (!existing) return { error: "Stock Adjustment not found." };

  const materialId = String(values["materialId"] ?? "").trim();
  const warehouseName = String(values["warehouseName"] ?? "").trim();
  const adjustmentType = String(values["adjustmentType"] ?? "");
  const quantity = Number(values["quantity"] ?? 0);
  if (!materialId || !warehouseName || !Number.isFinite(quantity) || quantity <= 0) {
    return { error: "Material, Warehouse and a positive Quantity are required." };
  }

  const originalMaterialId = String(existing["materialId"] ?? "").trim();
  const originalWarehouseName = String(existing["warehouseName"] ?? "").trim();
  const originalDelta = existing["adjustmentType"] === "Decrease" ? -Number(existing["quantity"] ?? 0) : Number(existing["quantity"] ?? 0);
  const hasOriginalEffect = Boolean(originalMaterialId) && Boolean(originalWarehouseName) && Number.isFinite(originalDelta) && originalDelta !== 0;

  if (hasOriginalEffect) {
    await adjustStockQty(partnerId, originalMaterialId, originalMaterialId, originalWarehouseName, -originalDelta);
  }

  const newDelta = adjustmentType === "Decrease" ? -quantity : quantity;
  if (newDelta < 0) {
    const available = await getQtyOnHand(partnerId, materialId, warehouseName);
    if (available < quantity) {
      // Put the reversal back before failing, so a rejected edit leaves stock untouched.
      if (hasOriginalEffect) {
        await adjustStockQty(partnerId, originalMaterialId, originalMaterialId, originalWarehouseName, originalDelta);
      }
      return { error: `Cannot decrease by ${quantity} — only ${available} on hand for this material at this warehouse.` };
    }
  }

  const bomOptions = await getBomOptionsForPartner(partnerId);
  const isSerialized = bomOptions.some((o) => o.label === materialId && o.serialized);
  const serialNumbers = parseSerialNumbers(values["serialNumbers"]);
  if (isSerialized) {
    const error = validateSerialNumbers(serialNumbers, quantity, materialId);
    if (error) {
      if (hasOriginalEffect) {
        await adjustStockQty(partnerId, originalMaterialId, originalMaterialId, originalWarehouseName, originalDelta);
      }
      return { error };
    }
  }

  await updateBusinessRecord(partnerId, "inventory-stock-adjustments", recordId, {
    ...values,
    serialNumbers: isSerialized ? serialNumbers : [],
  });
  await adjustStockQty(partnerId, materialId, materialId, warehouseName, newDelta);

  revalidatePath(`/partner/${partnerId}/inventory/stock-adjustments`);
  revalidatePath(`/partner/${partnerId}/inventory/stock-adjustments/${recordId}`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  redirect(`/partner/${partnerId}/inventory/stock-adjustments/${recordId}?updated=1`);
}

export async function bulkImportStockAdjustmentsAction(partnerId: string, formData: FormData): Promise<BulkImportResult> {
  partnerId = await requireSessionPartnerId(partnerId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a CSV file to upload");

  const bomOptions = await getBomOptionsForPartner(partnerId);
  const fields = await getStockAdjustmentFormFields(partnerId);
  const result = await runBulkImport(partnerId, "inventory-stock-adjustments", file, fields, async (values) => {
    const materialId = String(values["materialId"] ?? "").trim();
    const warehouseName = String(values["warehouseName"] ?? "").trim();
    const quantity = Number(values["quantity"] ?? 0);
    if (!materialId || !warehouseName || !Number.isFinite(quantity) || quantity <= 0) return values;

    const isSerialized = bomOptions.some((o) => o.label === materialId && o.serialized);
    const serialNumbers = parseSerialNumbers(values["serialNumbers"]);
    if (isSerialized) {
      const error = validateSerialNumbers(serialNumbers, quantity, materialId);
      if (error) throw new Error(`Row for "${materialId}": ${error}`);
    }

    const delta = values["adjustmentType"] === "Decrease" ? -quantity : quantity;
    await adjustStockQty(partnerId, materialId, materialId, warehouseName, delta);
    return { ...values, serialNumbers: isSerialized ? serialNumbers : [] };
  });
  revalidatePath(`/partner/${partnerId}/inventory/stock-adjustments`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  return result;
}
