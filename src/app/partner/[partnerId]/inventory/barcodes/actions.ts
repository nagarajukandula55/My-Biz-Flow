"use server";

import { revalidatePath } from "next/cache";
import { createBusinessRecord, getBusinessRecord, updateBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { assertPageTierAccess } from "@/lib/tenant";
import { BARCODE_TYPES, DEFAULT_BARCODE_SETTINGS, LABEL_PRESETS, formatInternalBarcode, type BarcodeSettings } from "@/lib/barcodes";
import { assertMaterialBarcodeAvailable, assignGeneratedBarcode, assertPosBarcodeAccess } from "@/lib/barcodeCatalog";
import { withRecordLock } from "@/lib/withRecordLock";

function positive(value: unknown, fallback: number, max: number) { const n = Number(value); return Number.isInteger(n) && n > 0 && n <= max ? n : fallback; }

export async function saveBarcodeSettingsAction(partnerId: string, input: Record<string, unknown>): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  await assertPosBarcodeAccess(partnerId);
  await assertPageTierAccess(partnerId, "inventory.barcodes");
  const barcodeType = BARCODE_TYPES.includes(String(input.barcodeType) as typeof BARCODE_TYPES[number]) ? String(input.barcodeType) as BarcodeSettings["barcodeType"] : "CODE128";
  const settings: BarcodeSettings = {
    prefix: String(input.prefix ?? "").trim().toUpperCase(), sequenceStart: positive(input.sequenceStart, 1, 999999999),
    nextSequence: positive(input.nextSequence, positive(input.sequenceStart, 1, 999999999), 999999999),
    length: positive(input.length, 6, 18), barcodeType,
    priceDisplay: ["MRP", "SALE", "BOTH", "NONE"].includes(String(input.priceDisplay)) ? String(input.priceDisplay) as BarcodeSettings["priceDisplay"] : "BOTH",
    labelWidthMm: positive(input.labelWidthMm, 50, 210), labelHeightMm: positive(input.labelHeightMm, 25, 297),
    labelFields: Array.isArray(input.labelFields) ? input.labelFields.map(String) : DEFAULT_BARCODE_SETTINGS.labelFields,
    labelPreset: Object.hasOwn(LABEL_PRESETS, String(input.labelPreset)) ? String(input.labelPreset) as BarcodeSettings["labelPreset"] : "CUSTOM",
  };
  const existing = await getBusinessRecord(partnerId, "inventory-barcode-settings", "default");
  if (existing) await updateBusinessRecord(partnerId, "inventory-barcode-settings", "default", { ...existing, ...settings, id: "default" });
  else await createBusinessRecord(partnerId, "inventory-barcode-settings", { ...settings, id: "default" });
  revalidatePath(`/partner/${partnerId}/inventory/barcodes`);
}

export async function generateBarcodeAction(partnerId: string, materialId: string): Promise<{ barcode: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  await assertPosBarcodeAccess(partnerId);
  await assertPageTierAccess(partnerId, "inventory.barcodes");
  const result = await withRecordLock("inventory-partner", partnerId, async () => {
    const stored = await getBusinessRecord(partnerId, "inventory-barcode-settings", "default");
    const settings = { ...DEFAULT_BARCODE_SETTINGS, ...(stored ?? {}) } as BarcodeSettings;
    if (settings.barcodeType === "EAN13") throw new Error("EAN-13 codes must be entered from your GS1 allocation; choose Code 128 for an internal series.");
    let sequence = positive(settings.nextSequence, settings.sequenceStart, 999999999);
    let barcode = formatInternalBarcode(settings, sequence);
    // A manually imported code may already occupy the next internal number.
    // Skip it safely rather than reusing it or leaving the series unusable.
    for (let attempts = 0; attempts < 1000; attempts += 1) {
      try { await assertMaterialBarcodeAvailable(partnerId, { barcode, barcodeType: settings.barcodeType }, materialId); break; }
      catch (error) {
        if (!(error instanceof Error) || !error.message.includes("already assigned")) throw error;
        sequence += 1; barcode = formatInternalBarcode(settings, sequence);
      }
    }
    await assignGeneratedBarcode(partnerId, materialId, settings, barcode);
    await createBusinessRecord(partnerId, "inventory-barcode-audit", { materialId, barcode, action: "Generated product barcode", at: new Date().toISOString() });
    const next = { ...(stored ?? {}), ...settings, id: "default", nextSequence: sequence + 1 };
    if (stored) await updateBusinessRecord(partnerId, "inventory-barcode-settings", "default", next);
    else await createBusinessRecord(partnerId, "inventory-barcode-settings", next);
    return { barcode };
  });
  revalidatePath(`/partner/${partnerId}/inventory/bom`);
  revalidatePath(`/partner/${partnerId}/inventory/bom/${materialId}`);
  revalidatePath(`/partner/${partnerId}/pos/checkout`);
  return result;
}

/** Audits a requested browser/driver print. It intentionally records the request before the browser dialog opens. */
export async function recordBarcodePrintAction(partnerId: string, materialIds: string[], labelCount: number, source: "single" | "batch" | "unit"): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  await assertPosBarcodeAccess(partnerId);
  await assertPageTierAccess(partnerId, "inventory.barcodes");
  const ids = [...new Set(materialIds.map(String).filter(Boolean))].slice(0, 500);
  if (!ids.length || !Number.isInteger(labelCount) || labelCount < 1 || labelCount > 5000) throw new Error("Invalid barcode print request.");
  await createBusinessRecord(partnerId, "inventory-barcode-audit", { materialIds: ids, action: "Print requested", source, labelCount, at: new Date().toISOString() });
}

/** Creates print-ready unique labels such as PRO-0001-001. They become sellable only after
 * the same codes are entered/scanned into the serialized Stock Adjustment receipt. */
export async function generateUnitBarcodeSeriesAction(partnerId: string, materialId: string, quantity: number): Promise<{ codes: string[] }> {
  partnerId = await requireSessionPartnerId(partnerId);
  await assertPosBarcodeAccess(partnerId);
  await assertPageTierAccess(partnerId, "inventory.barcodes");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) throw new Error("Generate between 1 and 500 unique unit labels at a time.");
  return withRecordLock("inventory-partner", partnerId, async () => {
    const material = await getBusinessRecord(partnerId, "inventory-bom", materialId);
    if (!material) throw new Error("Material not found.");
    if (!material["serialized"]) throw new Error("Turn on Serialized for this material before generating individual unit labels.");
    const base = String(material["barcode"] ?? "").trim().toUpperCase();
    if (!base) throw new Error("Generate or enter the product barcode first.");
    const prior = await listBusinessRecords(partnerId, "inventory-barcode-units");
    const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matcher = new RegExp(`^${escaped}-(\\d+)$`);
    const highest = prior.reduce((max, row) => {
      const match = String(row["unitCode"] ?? "").match(matcher);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    const codes = Array.from({ length: quantity }, (_, index) => `${base}-${String(highest + index + 1).padStart(3, "0")}`);
    for (const unitCode of codes) await createBusinessRecord(partnerId, "inventory-barcode-units", { materialId, unitCode, status: "Generated", generatedAt: new Date().toISOString() });
    await createBusinessRecord(partnerId, "inventory-barcode-audit", { materialId, barcode: base, action: "Generated unique unit labels", quantity, unitCodes: codes, at: new Date().toISOString() });
    return { codes };
  });
}

/** A variant is a separate sellable stock record, not a text-only option on the parent. */
export async function createBarcodeVariantAction(partnerId: string, materialId: string, variant: string, packSize: string): Promise<{ id: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  await assertPosBarcodeAccess(partnerId);
  await assertPageTierAccess(partnerId, "inventory.barcodes");
  const parent = await getBusinessRecord(partnerId, "inventory-bom", materialId);
  if (!parent) throw new Error("Material not found.");
  const variantName = variant.trim();
  if (!variantName) throw new Error("Enter a variant, colour, size or pack description.");
  const { id: _id, barcode: _barcode, barcodeType: _barcodeType, barcodeSource: _barcodeSource, barcodeAssignedAt: _barcodeAssignedAt, ...copy } = parent;
  const record = await createBusinessRecord(partnerId, "inventory-bom", {
    ...copy,
    parentMaterialId: materialId,
    variant: variantName,
    packSize: packSize.trim() || String(parent["packSize"] ?? ""),
    description: `${String(parent["description"] ?? materialId)} - ${variantName}`,
    barcode: "",
    status: "Active",
  });
  await createBusinessRecord(partnerId, "inventory-barcode-audit", { materialId: String(record.id), parentMaterialId: materialId, action: "Created barcode variant", variant: variantName, at: new Date().toISOString() });
  revalidatePath(`/partner/${partnerId}/inventory/bom`);
  return { id: String(record.id) };
}
